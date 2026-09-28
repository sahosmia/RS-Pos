<?php

namespace App\Actions\Purchases\Purchase;

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
     * @param  array{supplier_id: int, purchase_date: string, status: string, discount_type?: string|null, discount_value?: float|string|null, items: array<int, array{product_id: int, quantity: float|string, original_price?: float|string|null, unit_price: float|string, discount_type?: string|null, discount_value?: float|string|null}>}  $data
     */
    public function execute(array $data): Purchase
    {
        return DB::transaction(function () use ($data) {
            $purchase = Purchase::create([
                'supplier_id' => $data['supplier_id'],
                'invoice_no' => Settings::current()->generatePurchaseNumber(),
                'purchase_date' => $data['purchase_date'],
                'status' => $data['status'],
                'discount_type' => $data['discount_type'] ?? null,
                'discount_value' => $data['discount_value'] ?? 0,
                'created_by' => Auth::id(),
            ]);

            PurchaseTotals::sync($purchase, $data['items'])->applyTo($purchase);

            return $purchase;
        });
    }
}
