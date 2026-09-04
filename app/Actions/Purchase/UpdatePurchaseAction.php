<?php

namespace App\Actions\Purchase;

use App\Models\Purchase;
use Illuminate\Support\Facades\DB;

/**
 * Only reachable while the purchase is still Draft/Ordered — guarded by
 * Purchase::canEdit() at the controller layer, since it has no stock
 * movement or ledger entry to keep consistent yet.
 */
class UpdatePurchaseAction
{
    /**
     * @param  array{supplier_id: int, purchase_date: string, status: string, items: array<int, array{product_id: int, quantity: float|string, unit_price: float|string}>}  $data
     */
    public function execute(Purchase $purchase, array $data): Purchase
    {
        return DB::transaction(function () use ($purchase, $data) {
            $purchase->update([
                'supplier_id' => $data['supplier_id'],
                'purchase_date' => $data['purchase_date'],
                'status' => $data['status'],
            ]);

            $purchase->items()->delete();

            $total = 0.0;

            foreach ($data['items'] as $item) {
                $quantity = (float) $item['quantity'];
                $unitPrice = (float) $item['unit_price'];
                $subtotal = round($quantity * $unitPrice, 2);

                $purchase->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ]);

                $total += $subtotal;
            }

            $purchase->forceFill(['total_amount' => round($total, 2), 'due_amount' => round($total, 2)])->save();

            return $purchase;
        });
    }
}
