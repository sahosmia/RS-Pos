<?php

namespace App\Actions\Sale;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\SaleSource;
use App\Enums\SaleStatus;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\AccountService;
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
 * LedgerService, and AccountService entirely — it exists only for
 * reporting/record-keeping, so it's recorded as fully paid with no live
 * side effects (there's no ledger entry a future payment could reduce).
 */
class ConfirmSaleAction
{
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger,
        private AccountService $accounts,
    ) {}

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    public function execute(Sale $sale, array $payments = []): Sale
    {
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

            foreach ($sale->items as $item) {
                $this->sellItem($sale, $item);
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

            return $sale->fresh(['items.product', 'customer']);
        });
    }

    private function sellItem(Sale $sale, SaleItem $item): void
    {
        /** @var Product $product */
        $product = $item->product;

        $item->forceFill([
            'cost_at_sale' => $product->avg_cost,
            'warranty_expires_at' => $product->warranty_period_months
                ? $sale->sale_date->copy()->addMonths($product->warranty_period_months)
                : null,
        ])->save();

        $this->stock->decrease($product, $item->quantity, StockMovementType::Sale, 'sale', $sale->id);
    }
}
