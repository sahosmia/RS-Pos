<?php

namespace App\Actions\Sales\Sale;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\EmiFrequency;
use App\Enums\EmiInstallmentStatus;
use App\Enums\EmiInterestMethod;
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
use App\Services\EmiCalculator;
use App\Services\JournalService;
use App\Services\LedgerService;
use App\Services\StockService;
use Carbon\CarbonImmutable;
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
        private EmiCalculator $emiCalculator,
    ) {}

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     * @param  array<int, array<int, string>>  $serialSelections  Keyed by sale_item_id — which in-stock unit(s) this line sells, required when the product tracks serials.
     * @param  array<int, array{quantity: float, unit_cost: float}>  $keptCosts  Amending only: per product, how many units of the earlier version of this sale are being sold again and at what cost each. Those units keep their original cost (the sale's profit does not move because the average cost has since changed); any extra units take today's average.
     *
     * @throws InvalidSerialSelectionException
     */
    public function execute(Sale $sale, array $payments = [], array $serialSelections = [], array $keptCosts = []): Sale
    {
        if ($sale->status === SaleStatus::Confirmed) {
            return $sale;
        }

        return DB::transaction(function () use ($sale, $payments, $serialSelections, $keptCosts) {
            // A double click or a retried request can reach here twice: lock the row and look again.
            if (Sale::query()->whereKey($sale->id)->lockForUpdate()->value('status') === SaleStatus::Confirmed) {
                return $sale->fresh(['items.product', 'customer']);
            }

            $sale->load('items.product', 'customer');

            if ($sale->source === SaleSource::Imported) {
                $sale->update(['status' => SaleStatus::Confirmed]);
                $sale->forceFill([
                    'paid_amount' => $sale->total_amount,
                    'due_amount' => 0,
                    'payment_status' => 'paid',
                ])->save();

                // A line that names its own warranty keeps it, so an old invoice still shows when it ran out.
                foreach ($sale->items->filter(fn (SaleItem $item) => (int) $item->warranty_months > 0) as $item) {
                    $item->forceFill(['warranty_expires_at' => $sale->sale_date->copy()->addMonths($item->warranty_months)])->save();
                }

                return $sale->fresh(['items.product', 'customer']);
            }

            $costOfGoodsSold = 0.0;

            foreach ($sale->items as $item) {
                $costOfGoodsSold += $this->sellItem($sale, $item, $serialSelections[$item->id] ?? [], $keptCosts);
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

            // Interest joins the sale's total BEFORE the customer's due is worked out, so the ledger, receivable and
            // payment status all see the amount the customer really owes.
            $emiPlan = $this->planEmi($sale, $paidViaAccounts);

            if ($emiPlan !== null && $emiPlan['interest_total'] > 0) {
                $sale->forceFill([
                    'total_amount' => round($sale->total_amount + $emiPlan['interest_total'], 2),
                    'emi_interest_total' => $emiPlan['interest_total'],
                ])->save();
            }

            $dueAmount = round($sale->total_amount - $paidViaAccounts, 2);

            if ($dueAmount !== 0.0) {
                $this->ledger->recordContact($sale->customer, ContactLedgerType::SaleInvoice, $dueAmount, 'sale', $sale->id);
            }

            $sale->update(['status' => SaleStatus::Confirmed]);
            $sale->recalculatePaymentTotals();

            if ($sale->financing_type === SalePaymentType::Emi && $sale->installment_count) {
                $this->generateEmiSchedule($sale, $emiPlan);
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
    private function sellItem(Sale $sale, SaleItem $item, array $serialNumbers, array &$keptCosts = []): float
    {
        /** @var Product $product */
        $product = $item->product;

        // The line's own warranty wins; a line that never chose takes the product's as it is right now, and the result is
        // recorded on the line so a later change to the product never reaches this sale.
        $warrantyMonths = (int) ($item->warranty_months ?? $product->warranty_period_months ?? 0);

        $unitCost = $this->unitCostFor($product, (float) $item->quantity, $keptCosts);

        $item->forceFill([
            'cost_at_sale' => $unitCost,
            'warranty_months' => $warrantyMonths,
            'warranty_expires_at' => $warrantyMonths > 0 ? $sale->sale_date->copy()->addMonths($warrantyMonths) : null,
        ])->save();

        $this->stock->decrease($product, $item->quantity, StockMovementType::Sale, 'sale', $sale->id, unitCost: $item->cost_at_sale);

        if ($product->track_serial_number) {
            $this->assignSerials($product, $item, $serialNumbers);
        }

        if ($item->service_plan_included) {
            $this->snapshotServicePeriods($item, $product, $sale);
        }

        if ($item->installation_required) {
            $this->createInstallationRequest($item, $sale);
        }

        return $unitCost * $item->quantity;
    }

    /**
     * The cost each unit of this line is sold at. Normally the product's average cost right now. When an earlier version of
     * the sale is being amended, units that were already part of it keep the cost they were sold at (so the sale's profit and
     * the Inventory value stay consistent), and only units added by the amendment take the current average.
     *
     * @param  array<int, array{quantity: float, unit_cost: float}>  $keptCosts
     */
    private function unitCostFor(Product $product, float $quantity, array &$keptCosts): float
    {
        $kept = $keptCosts[$product->id] ?? null;

        if ($kept === null || $kept['quantity'] <= 0 || $quantity <= 0) {
            return (float) $product->avg_cost;
        }

        $covered = min($quantity, $kept['quantity']);
        $keptCosts[$product->id]['quantity'] = $kept['quantity'] - $covered;

        return round((($covered * $kept['unit_cost']) + (($quantity - $covered) * (float) $product->avg_cost)) / $quantity, 4);
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
     * The calculated schedule for a sale that carries EMI terms (a tenure), or null for one that doesn't — the
     * older count-only sales keep the plain equal split below. The financed amount is what is left after the
     * down payment paid now and any Sales Order advance already carried.
     *
     * @return array{periods: int, principal: float, interest_total: float, total_payable: float, installment_amount: float, schedule: list<array<string, mixed>>}|null
     */
    private function planEmi(Sale $sale, float $downPayment): ?array
    {
        if ($sale->financing_type !== SalePaymentType::Emi || ! $sale->emi_tenure_value || ! $sale->installment_count) {
            return null;
        }

        // Only the products chosen for EMI are financed (e.g. the AC). The other lines (wiring, pipe, brackets…) and
        // the installation charge are billed on the same invoice but are never part of the installments and never
        // earn interest.
        $installation = round((float) $sale->installation_amount, 2);
        $received = round($downPayment + $this->salesOrderAdvance($sale), 2);
        $goods = round($sale->total_amount - $installation, 2);
        $financedGoods = $sale->emiFinancedGoods();
        $cashGoods = round($goods - $financedGoods, 2);

        // Money paid at confirm time covers the non-EMI products first — they are "paid now" — then the installation
        // when the sale says it is collected up front (otherwise it stays an ordinary due, collected later with
        // "Add Payment"). Only what is left over is a down payment on the EMI products.
        $coveredFirst = $cashGoods + ($sale->emi_installation_upfront ? $installation : 0.0);
        $financed = round($financedGoods - max(0.0, $received - $coveredFirst), 2);

        if ($financed <= 0.0) {
            return null;
        }

        $frequency = EmiFrequency::tryFrom((string) $sale->emi_frequency) ?? EmiFrequency::Monthly;

        return $this->emiCalculator->calculate(
            $financed,
            EmiInterestMethod::tryFrom((string) $sale->emi_interest_method) ?? EmiInterestMethod::None,
            (float) $sale->emi_annual_rate,
            $sale->installment_count,
            $frequency,
            $frequency->dueDate(CarbonImmutable::parse($sale->sale_date->toDateString()), 1),
        );
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
    private function generateEmiSchedule(Sale $sale, ?array $emiPlan = null): void
    {
        if ($sale->due_amount <= 0.0) {
            return;
        }

        // Terms were chosen on the sale (interest method, tenure, frequency): lay out the calculated schedule.
        if ($emiPlan !== null) {
            foreach ($emiPlan['schedule'] as $row) {
                $sale->emiInstallments()->create([
                    'installment_number' => $row['number'],
                    'due_date' => $row['due_date'],
                    'amount' => $row['amount'],
                    'principal_amount' => $row['principal'],
                    'interest_amount' => $row['interest'],
                    'status' => EmiInstallmentStatus::Pending,
                ]);
            }

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

        // EMI interest is part of what the customer owes (it is in total_amount) but it is not sales revenue.
        $interest = round((float) $sale->emi_interest_total, 2);

        $lines = [
            ['chart_of_account_id' => $receivable->id, 'debit' => $sale->total_amount, 'credit' => 0],
            ['chart_of_account_id' => $revenue->id, 'debit' => 0, 'credit' => round($sale->total_amount - $interest, 2)],
        ];

        if ($interest > 0.0) {
            // "Other Income": the closest existing account. A dedicated "EMI Interest Income" account is a
            // chart-of-accounts decision for the accountant.
            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->code('4400')->id, 'debit' => 0, 'credit' => $interest];
        }

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
