<?php

namespace App\Actions\Sales\Sale;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\EmiInstallmentStatus;
use App\Enums\SalePaymentType;
use App\Enums\SaleSource;
use App\Enums\SaleStatus;
use App\Enums\SerialNumberStatus;
use App\Enums\ServiceRequestStatus;
use App\Enums\ServiceRequestType;
use App\Enums\StockMovementType;
use App\Exceptions\InvalidSerialSelectionException;
use App\Models\Account;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SerialNumber;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

/**
 * Marks a Draft/Quotation sale Confirmed — the one place stock and the
 * customer's ledger actually move for this sale. `cost_at_sale` is
 * snapshotted from the product's current avg_cost (which itself is never
 * touched by a sale) and warranty_expires_at from the product's warranty
 * period, both in the same transaction as the stock decrease.
 *
 * A "Historical record" sale (source: imported) skips StockService,
 * LedgerService, AccountService, and the journal post entirely — it exists
 * only for reporting/record-keeping, so it's recorded as fully paid with no
 * live side effects (there's no ledger entry a future payment could reduce).
 */
class ConfirmSaleAction
{
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger,
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     * @param  array<int, array<int, string>>  $serialSelections  Keyed by sale_item_id — which in-stock unit(s) this line sells, required when the product tracks serials.
     *
     * @throws InvalidSerialSelectionException
     */
    public function execute(Sale $sale, array $payments = [], array $serialSelections = []): Sale
    {
        if ($sale->status === SaleStatus::Confirmed) {
            return $sale;
        }

        return DB::transaction(function () use ($sale, $payments, $serialSelections) {
            $sale->load('items.product', 'customer');

            if ($sale->source === SaleSource::Imported) {
                $sale->update(['status' => SaleStatus::Confirmed]);
                $sale->forceFill([
                    'paid_amount' => $sale->total_amount,
                    'due_amount' => 0,
                    'payment_status' => 'paid',
                ])->save();

                return $sale->fresh(['items.product', 'customer']);
            }

            $costOfGoodsSold = 0.0;

            foreach ($sale->items as $item) {
                $costOfGoodsSold += $this->sellItem($sale, $item, $serialSelections[$item->id] ?? []);
            }

            $paidViaAccounts = 0.0;

            if ($payments !== []) {
                $paidViaAccounts = $this->accounts->recordSplitPayment(
                    $payments,
                    AccountTransactionType::SalePayment,
                    $sale->sale_date,
                    'sale',
                    $sale->id,
                );
            }

            $dueAmount = round($sale->total_amount - $paidViaAccounts, 2);

            if ($dueAmount !== 0.0) {
                $this->ledger->recordContact($sale->customer, ContactLedgerType::SaleInvoice, $dueAmount, 'sale', $sale->id);
            }

            $sale->update(['status' => SaleStatus::Confirmed]);
            $sale->recalculatePaymentTotals();

            if ($sale->financing_type === SalePaymentType::Emi && $sale->installment_count) {
                $this->generateEmiSchedule($sale);
            }

            $this->postJournal($sale, $payments, round($costOfGoodsSold, 2));

            return $sale->fresh(['items.product', 'customer']);
        });
    }

    /**
     * Returns this item's cost_at_sale × quantity, for the COGS journal line.
     *
     * @param  array<int, string>  $serialNumbers
     */
    private function sellItem(Sale $sale, SaleItem $item, array $serialNumbers): float
    {
        /** @var Product $product */
        $product = $item->product;

        $item->forceFill([
            'cost_at_sale' => $product->avg_cost,
            'warranty_expires_at' => $product->warranty_period_months
                ? $sale->sale_date->copy()->addMonths($product->warranty_period_months)
                : null,
        ])->save();

        $this->stock->decrease($product, $item->quantity, StockMovementType::Sale, 'sale', $sale->id, unitCost: $item->cost_at_sale);

        if ($product->track_serial_number) {
            $this->assignSerials($product, $item, $serialNumbers);
        }

        $this->snapshotServicePeriods($item, $product, $sale);

        if ($item->installation_required) {
            $this->createInstallationRequest($item, $sale);
        }

        return $product->avg_cost * $item->quantity;
    }

    /**
     * Copies the product's current service_plan_templates onto this sold
     * unit as sale_item_service_periods, with computed date ranges — done
     * once, at confirm time, so later template edits never change units
     * already sold (পর্ব ১০).
     */
    private function snapshotServicePeriods(SaleItem $item, Product $product, Sale $sale): void
    {
        $periodStart = $sale->sale_date->copy();

        foreach ($product->servicePlanTemplates as $template) {
            $periodEnd = $periodStart->copy()->addMonths($template->period_months);

            $item->servicePeriods()->create([
                'period_number' => $template->period_number,
                'period_months' => $template->period_months,
                'free_quota' => $template->free_quota,
                'period_start_date' => $periodStart,
                'period_end_date' => $periodEnd,
            ]);

            $periodStart = $periodEnd;
        }
    }

    /**
     * Splits the sale's remaining due into `installment_count` monthly
     * installments, first due one month after the sale date — any down
     * payment collected at confirm time (via `$payments`) has already been
     * subtracted out of `due_amount` by `recalculatePaymentTotals()` above,
     * so only what's left over gets scheduled (পর্ব ১১). The last
     * installment absorbs the rounding remainder so the schedule always
     * sums back to exactly `due_amount`.
     */
    private function generateEmiSchedule(Sale $sale): void
    {
        if ($sale->due_amount <= 0.0) {
            return;
        }

        $count = $sale->installment_count;
        $installmentAmount = round($sale->due_amount / $count, 2);
        $remaining = $sale->due_amount;

        for ($number = 1; $number <= $count; $number++) {
            $amount = $number === $count ? round($remaining, 2) : $installmentAmount;
            $remaining = round($remaining - $amount, 2);

            $sale->emiInstallments()->create([
                'installment_number' => $number,
                'due_date' => $sale->sale_date->copy()->addMonths($number),
                'amount' => $amount,
                'status' => EmiInstallmentStatus::Pending,
            ]);
        }
    }

    /**
     * Installation is entered directly in the Add Sale form (its charge
     * already collected as part of the sale) — this just gives it a
     * service_requests row too, so it shows up in the same service history
     * as later paid/free servicing. Never counts against a period's free
     * quota (পর্ব ১০), and posts no journal entry of its own since the
     * charge already moved with the sale itself.
     */
    private function createInstallationRequest(SaleItem $item, Sale $sale): void
    {
        $item->serviceRequests()->create([
            'request_date' => $sale->sale_date,
            'service_date' => $sale->sale_date,
            'type' => ServiceRequestType::Installation,
            'is_free' => false,
            'charge_amount' => $item->installation_charge ?? 0,
            'status' => ServiceRequestStatus::Completed,
        ]);
    }

    /**
     * Claims exactly $item->quantity currently in-stock units of this
     * product — never free-text, since only a real unit already sitting in
     * inventory can be sold.
     *
     * @param  array<int, string>  $serialNumbers
     *
     * @throws InvalidSerialSelectionException
     */
    private function assignSerials(Product $product, SaleItem $item, array $serialNumbers): void
    {
        $serialNumbers = array_values(array_unique($serialNumbers));

        if (count($serialNumbers) !== (int) $item->quantity) {
            throw new InvalidSerialSelectionException(
                "\"{$product->name}\" tracks serial numbers — expected {$item->quantity} unique serial(s), got ".count($serialNumbers).'.',
                $item->id,
            );
        }

        foreach ($serialNumbers as $serialNumber) {
            $serial = SerialNumber::query()
                ->where('product_id', $product->id)
                ->where('serial_number', $serialNumber)
                ->where('status', SerialNumberStatus::InStock)
                ->lockForUpdate()
                ->first();

            if ($serial === null) {
                throw new InvalidSerialSelectionException(
                    "Serial \"{$serialNumber}\" is not an in-stock unit of \"{$product->name}\".",
                    $item->id,
                );
            }

            $serial->update(['status' => SerialNumberStatus::Sold, 'sale_item_id' => $item->id]);
        }
    }

    /**
     * Two line pairs in one entry: Dr Accounts Receivable/Cash, Cr Sales
     * Revenue for the sale itself, and Dr Cost of Goods Sold, Cr Inventory
     * for the stock leaving — plus one Dr {paying account} / Cr Accounts
     * Receivable line per account paid at confirm time, plus (when this
     * sale fulfils a Sales Order that took an advance) one Dr Customer
     * Advances / Cr Accounts Receivable line clearing that advance out of
     * both accounts — without it, 1100 would carry the sale's *full*
     * amount forever even though the advance already settled part of it,
     * permanently overstating Accounts Receivable relative to the
     * customer's real due (পর্ব ৬.৫ Reconciliation Check).
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function postJournal(Sale $sale, array $payments, float $costOfGoodsSold): void
    {
        $receivable = $this->chartOfAccounts->code('1100');
        $revenue = $this->chartOfAccounts->code('4100');
        $cogs = $this->chartOfAccounts->code('5100');
        $inventory = $this->chartOfAccounts->code('1200');

        $lines = [
            ['chart_of_account_id' => $receivable->id, 'debit' => $sale->total_amount, 'credit' => 0],
            ['chart_of_account_id' => $revenue->id, 'debit' => 0, 'credit' => $sale->total_amount],
        ];

        if ($costOfGoodsSold > 0.0) {
            $lines[] = ['chart_of_account_id' => $cogs->id, 'debit' => $costOfGoodsSold, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $inventory->id, 'debit' => 0, 'credit' => $costOfGoodsSold];
        }

        foreach ($payments as $payment) {
            $amount = round((float) $payment['amount'], 2);
            $account = Account::findOrFail($payment['account_id']);

            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $receivable->id, 'debit' => 0, 'credit' => $amount];
        }

        $advanceCarried = $this->salesOrderAdvance($sale);

        if ($advanceCarried > 0.0) {
            $customerAdvances = $this->chartOfAccounts->code('2150');
            $lines[] = ['chart_of_account_id' => $customerAdvances->id, 'debit' => $advanceCarried, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $receivable->id, 'debit' => 0, 'credit' => $advanceCarried];
        }

        $this->journal->post(
            $sale->sale_date,
            "Sale {$sale->invoice_no}",
            $lines,
            'sale',
            $sale->id,
        );
    }

    /**
     * Same figure Sale::recalculatePaymentTotals() folds into paid_amount —
     * read from the same, never-rewritten account_transactions row keyed
     * to the originating Sales Order.
     */
    private function salesOrderAdvance(Sale $sale): float
    {
        if (! $sale->sales_order_id) {
            return 0.0;
        }

        return abs((float) DB::table('account_transactions')
            ->where('reference_type', 'sales_order')
            ->where('reference_id', $sale->sales_order_id)
            ->sum('amount'));
    }
}
