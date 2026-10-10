<?php

namespace App\Actions\Purchases\Purchase;

use App\Enums\PaymentStatus;
use App\Enums\PurchaseStatus;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * First half of editing a Received purchase. It takes the receipt out exactly as a cancellation does (stock back out,
 * serials removed, the average cost given back, the supplier's payable, the payments and the journal all reversed with
 * new opposite entries) and turns the same row back into a Draft, keeping its invoice number, so the caller can save the
 * corrected version and receive it again. Call it inside the same transaction as the rest of the amendment: if the
 * corrected purchase cannot be received, everything rolls back to the original.
 */
class ReopenPurchaseForAmendmentAction
{
    public function __construct(
        private CancelPurchaseAction $cancelPurchase,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * What each product on this purchase is worth in stock right now and how much of that comes from this purchase.
     * Read it BEFORE the purchase is reopened; settleValueDrift() compares it with the result.
     *
     * @return array<int, array{stock_value: float, purchased_value: float}>
     */
    public function snapshotValues(Purchase $purchase): array
    {
        $purchase->loadMissing('items');
        $snapshot = [];

        foreach ($purchase->items->groupBy('product_id') as $productId => $items) {
            $product = Product::query()->findOrFail($productId);

            $snapshot[$productId] = [
                'stock_value' => (float) $product->current_stock * (float) $product->avg_cost,
                'purchased_value' => $this->purchasedValue($purchase, $items),
            ];
        }

        return $snapshot;
    }

    /**
     * Second half of the bookkeeping of an amendment. Taking a receipt out and putting a corrected one in values the units
     * that were already sold at the new price, while their cost of sale was recorded at the old one. The stock side moves by
     * that amount and the books do not — so the difference is posted here, as a cost variance between Inventory and the cost
     * of goods sold, and the Inventory value in the books keeps matching the stock held. Call it after the corrected
     * purchase has been received again.
     *
     * @param  array<int, array{stock_value: float, purchased_value: float}>  $before
     */
    public function settleValueDrift(Purchase $purchase, array $before): void
    {
        $purchase->refresh()->load('items');
        $drift = 0.0;

        foreach ($before as $productId => $was) {
            $product = Product::query()->findOrFail($productId);
            $now = (float) $product->current_stock * (float) $product->avg_cost;
            $purchasedNow = $this->purchasedValue($purchase, $purchase->items->where('product_id', $productId));

            // The stock value should have moved by exactly what the purchase now brings in over what it brought before.
            $drift += $now - ($was['stock_value'] + ($purchasedNow - $was['purchased_value']));
        }

        $drift = round($drift, 2);

        if (abs($drift) < 0.01) {
            return;
        }

        $inventory = $this->chartOfAccounts->code('1200');
        $costOfGoods = $this->chartOfAccounts->code('5100');

        $this->journal->post(today(), "Purchase {$purchase->invoice_no}: cost of units already sold, after amendment", [
            ['chart_of_account_id' => $inventory->id, 'debit' => max($drift, 0), 'credit' => max(-$drift, 0)],
            ['chart_of_account_id' => $costOfGoods->id, 'debit' => max(-$drift, 0), 'credit' => max($drift, 0)],
        ], 'purchase', $purchase->id);
    }

    /**
     * What these lines brought into stock: quantity × price, scaled by any invoice discount (as ConfirmPurchaseAction values them).
     *
     * @param  Collection<int, PurchaseItem>  $items
     */
    private function purchasedValue(Purchase $purchase, $items): float
    {
        $factor = (float) $purchase->subtotal > 0 ? (float) $purchase->total_amount / (float) $purchase->subtotal : 1.0;

        return $items->sum(fn (PurchaseItem $item) => (float) $item->quantity * (float) $item->unit_price * $factor);
    }

    public function execute(Purchase $purchase, string $reason): Purchase
    {
        return DB::transaction(function () use ($purchase, $reason) {
            // Same lock as receive / cancel: two amendments at once must not both take the receipt out.
            Purchase::query()->whereKey($purchase->id)->lockForUpdate()->first();
            $purchase->refresh();

            if ($blockedBy = $purchase->amendBlockReason()) {
                throw ValidationException::withMessages(['purchase' => [$blockedBy]]);
            }

            // Stock may dip below zero for a moment (units of this receipt that were already sold); the caller checks the
            // stock is whole again once the corrected receipt is in.
            $this->cancelPurchase->execute($purchase, forAmendment: true);

            $purchase->refresh();
            $purchase->forceFill([
                'status' => PurchaseStatus::Draft,
                'paid_amount' => 0,
                'due_amount' => $purchase->total_amount,
                'payment_status' => PaymentStatus::Due,
            ])->save();

            activity()
                ->performedOn($purchase)
                ->causedBy(Auth::user())
                ->withProperties(['reason' => $reason])
                ->log('amended');

            return $purchase;
        });
    }
}
