<?php

namespace App\Actions\Sale;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\SaleSource;
use App\Enums\SaleStatus;
use App\Enums\StockMovementType;
use App\Models\Account;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
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
     */
    public function execute(Sale $sale, array $payments = []): Sale
    {
        if ($sale->status === SaleStatus::Confirmed) {
            return $sale;
        }

        return DB::transaction(function () use ($sale, $payments) {
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
                $costOfGoodsSold += $this->sellItem($sale, $item);
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

            $this->postJournal($sale, $payments, round($costOfGoodsSold, 2));

            return $sale->fresh(['items.product', 'customer']);
        });
    }

    /**
     * Returns this item's cost_at_sale × quantity, for the COGS journal line.
     */
    private function sellItem(Sale $sale, SaleItem $item): float
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

        return $product->avg_cost * $item->quantity;
    }

    /**
     * Two line pairs in one entry: Dr Accounts Receivable/Cash, Cr Sales
     * Revenue for the sale itself, and Dr Cost of Goods Sold, Cr Inventory
     * for the stock leaving — plus one Dr {paying account} / Cr Accounts
     * Receivable line per account paid at confirm time.
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

        $this->journal->post(
            $sale->sale_date,
            "Sale {$sale->invoice_no}",
            $lines,
            'sale',
            $sale->id,
        );
    }
}
