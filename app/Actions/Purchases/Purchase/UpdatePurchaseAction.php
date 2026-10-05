<?php

namespace App\Actions\Purchases\Purchase;

use App\Models\Purchase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Only reachable while the purchase is still Draft/Ordered — guarded by
 * Purchase::canEdit() at the controller layer, since it has no stock
 * movement or ledger entry to keep consistent yet.
 */
class UpdatePurchaseAction
{
    /**
     * @param  array{supplier_id: int, purchase_date: string, status: string, discount_type?: string|null, discount_value?: float|string|null, items: array<int, array{product_id: int, quantity: float|string, original_price?: float|string|null, unit_price: float|string, discount_type?: string|null, discount_value?: float|string|null}>}  $data
     */
    public function execute(Purchase $purchase, array $data): Purchase
    {
        return DB::transaction(function () use ($purchase, $data) {
            $purchase->update([
                'supplier_id' => $data['supplier_id'],
                'purchase_date' => $data['purchase_date'],
                'status' => $data['status'],
                'discount_type' => $data['discount_type'] ?? null,
                'discount_value' => $data['discount_value'] ?? 0,
            ]);

            PurchaseTotals::sync($purchase, $data['items'])->applyTo($purchase);

            // applyTo() resets due to the full total; an advance already paid has to be counted again.
            $purchase->recalculatePaymentTotals();

            if ($purchase->due_amount < 0) {
                throw ValidationException::withMessages([
                    'items' => 'The total cannot go below the ৳'.number_format($purchase->paid_amount, 2).' already paid on this purchase.',
                ]);
            }

            return $purchase;
        });
    }
}
