<?php

namespace App\Actions\Purchase;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\PurchaseStatus;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Services\AccountService;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

/**
 * Marks a Draft/Ordered purchase Received — the one place stock and the
 * supplier's ledger actually move for this purchase. Every item's
 * Weighted Average Cost is recalculated in the same transaction as the
 * stock increase, and any payment collected at receipt time (cash and/or
 * applying existing supplier credit) is recorded alongside.
 */
class ConfirmPurchaseAction
{
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger,
        private AccountService $accounts,
    ) {}

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    public function execute(Purchase $purchase, array $payments = [], float $creditApplied = 0.0): Purchase
    {
        return DB::transaction(function () use ($purchase, $payments, $creditApplied) {
            $purchase->load('items.product', 'supplier');

            foreach ($purchase->items as $item) {
                $this->receiveItem($purchase, $item);
            }

            $paidViaAccounts = 0.0;

            if ($payments !== []) {
                // Money leaving our accounts is negative, per AccountService's signed-amount convention.
                $negatedPayments = array_map(fn (array $payment) => [
                    'account_id' => $payment['account_id'],
                    'amount' => -abs((float) $payment['amount']),
                ], $payments);

                $paidViaAccounts = abs($this->accounts->recordSplitPayment(
                    $negatedPayments,
                    AccountTransactionType::PurchasePayment,
                    $purchase->purchase_date,
                    'purchase',
                    $purchase->id,
                ));
            }

            $creditApplied = round($creditApplied, 2);

            if ($creditApplied > 0.0) {
                $this->ledger->recordContact($purchase->supplier, ContactLedgerType::CreditApplied, -$creditApplied, 'purchase', $purchase->id);
            }

            $dueAmount = round($purchase->total_amount - $paidViaAccounts - $creditApplied, 2);

            if ($dueAmount !== 0.0) {
                $this->ledger->recordContact($purchase->supplier, ContactLedgerType::PurchaseBill, -$dueAmount, 'purchase', $purchase->id);
            }

            $purchase->update(['status' => PurchaseStatus::Received]);
            $purchase->recalculatePaymentTotals();

            return $purchase->fresh(['items.product', 'supplier']);
        });
    }

    /**
     * Weighted average cost must be computed from the stock quantity
     * *before* this purchase's increase is applied.
     */
    private function receiveItem(Purchase $purchase, PurchaseItem $item): void
    {
        /** @var Product $product */
        $product = $item->product;

        $newAvgCost = $product->current_stock <= 0
            ? $item->unit_price
            : (($product->current_stock * $product->avg_cost) + ($item->quantity * $item->unit_price))
                / ($product->current_stock + $item->quantity);

        $this->stock->increase($product, $item->quantity, StockMovementType::Purchase, 'purchase', $purchase->id);

        $product->forceFill(['avg_cost' => round($newAvgCost, 2)])->save();
    }
}
