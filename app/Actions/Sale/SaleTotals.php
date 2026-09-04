<?php

namespace App\Actions\Sale;

use App\Enums\DiscountType;
use App\Models\Product;
use App\Models\Sale;

/**
 * Item-level discount lives on each row (original_price vs unit_price);
 * invoice-level discount applies to the post-item-discount subtotal. Shared
 * by CreateSaleAction and UpdateSaleAction so both compute totals the same
 * way.
 */
class SaleTotals
{
    public function __construct(
        public float $subtotal,
        public float $discountAmount,
        public float $totalAmount,
    ) {}

    /**
     * Replaces the sale's items and computes subtotal/discount_amount/
     * total_amount from them plus the sale's own discount_type/value —
     * read `$sale->discount_type`/`discount_value` before calling this, and
     * only while the sale is still Draft/Quotation.
     *
     * @param  array<int, array{product_id: int, quantity: float|string, unit_price: float|string, installation_required?: bool, installation_charge?: float|string|null, note?: string|null, serial_numbers?: array<int, string>}>  $items
     */
    public static function sync(Sale $sale, array $items): self
    {
        $sale->items()->delete();

        $subtotal = 0.0;

        foreach ($items as $item) {
            $product = Product::findOrFail($item['product_id']);
            $quantity = (float) $item['quantity'];
            $unitPrice = (float) $item['unit_price'];
            $originalPrice = $product->selling_price;
            $itemSubtotal = round($quantity * $unitPrice, 2);

            $saleItem = $sale->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $quantity,
                'original_price' => $originalPrice,
                'unit_price' => $unitPrice,
                'discount_amount' => round($originalPrice - $unitPrice, 2),
                'subtotal' => $itemSubtotal,
                'installation_required' => $item['installation_required'] ?? false,
                'installation_charge' => $item['installation_charge'] ?? null,
                'note' => $item['note'] ?? null,
            ]);

            foreach ($item['serial_numbers'] ?? [] as $serial) {
                if (trim((string) $serial) !== '') {
                    $saleItem->serials()->create(['serial_number' => trim((string) $serial)]);
                }
            }

            $subtotal += $itemSubtotal;
        }

        $subtotal = round($subtotal, 2);

        $discountAmount = match ($sale->discount_type) {
            DiscountType::Flat => min((float) $sale->discount_value, $subtotal),
            DiscountType::Percentage => round($subtotal * (float) $sale->discount_value / 100, 2),
            default => 0.0,
        };

        return new self($subtotal, $discountAmount, round($subtotal - $discountAmount, 2));
    }

    public function applyTo(Sale $sale): void
    {
        $sale->forceFill([
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discountAmount,
            'total_amount' => $this->totalAmount,
            'due_amount' => $this->totalAmount,
        ])->save();
    }
}
