<?php

namespace App\Actions\Purchase;

use App\Models\Purchase;
use App\Models\Settings;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Creates a Draft or Ordered purchase — no stock/ledger effect yet. Only
 * ConfirmPurchaseAction (moving it to Received) touches stock and the
 * supplier's ledger.
 */
class CreatePurchaseAction
{
    /**
     * @param  array{supplier_id: int, purchase_date: string, status: string, items: array<int, array{product_id: int, quantity: float|string, unit_price: float|string}>}  $data
     */
    public function execute(array $data): Purchase
    {
        return DB::transaction(function () use ($data) {
            $purchase = Purchase::create([
                'supplier_id' => $data['supplier_id'],
                'invoice_no' => Settings::current()->generatePurchaseNumber(),
                'purchase_date' => $data['purchase_date'],
                'status' => $data['status'],
                'created_by' => Auth::id(),
            ]);

            $totalAmount = $this->syncItems($purchase, $data['items']);

            $purchase->forceFill(['total_amount' => $totalAmount, 'due_amount' => $totalAmount])->save();

            return $purchase;
        });
    }

    /**
     * @param  array<int, array{product_id: int, quantity: float|string, unit_price: float|string}>  $items
     */
    private function syncItems(Purchase $purchase, array $items): float
    {
        $total = 0.0;

        foreach ($items as $item) {
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

        return round($total, 2);
    }
}
