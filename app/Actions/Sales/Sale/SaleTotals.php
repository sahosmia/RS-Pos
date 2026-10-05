<?php

namespace App\Actions\Sales\Sale;

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
        /** Installation charges of the lines that need installation — billed on top of the goods, outside any discount. */
        public float $installationAmount = 0.0,
    ) {}

    /**
     * Replaces the sale's items and computes subtotal/discount_amount/
     * total_amount from them plus the sale's own discount_type/value —
     * read `$sale->discount_type`/`discount_value` before calling this, and
     * only while the sale is still Draft/Quotation.
     *
     * @param  array<int, array{product_id: int, quantity: float|string, original_price?: float|string|null, unit_price: float|string, discount_type?: string|null, discount_value?: float|string|null, installation_required?: bool, installation_charge?: float|string|null, note?: string|null, serial_numbers?: array<int, string>}>  $items
     */
    public static function sync(Sale $sale, array $items): self
    {
        $sale->items()->delete();

        $subtotal = 0.0;
        $installation = 0.0;

        foreach ($items as $item) {
            $product = Product::findOrFail($item['product_id']);
            $quantity = (float) $item['quantity'];

            // The Sale form lets a line's base price be edited away from the
            // product's current catalog price (a negotiated price for this
            // sale) — trust it when sent. Callers that don't send one (e.g.
            // ConvertSalesOrderToSaleAction, which has no discount UI of its
            // own) keep the old behavior of pinning it to the catalog price.
            $originalPrice = isset($item['original_price']) ? round((float) $item['original_price'], 4) : $product->selling_price;

            $itemDiscountType = isset($item['discount_type']) ? DiscountType::from($item['discount_type']) : null;
            $itemDiscountValue = (float) ($item['discount_value'] ?? 0);

            // discount_type/discount_value (set via the per-item discount
            // modal) are authoritative when present — unit_price is derived
            // from them rather than trusted as-is from the client. Falls
            // back to a directly-supplied unit_price for callers that don't
            // send a per-item discount at all.
            $unitPrice = $itemDiscountType !== null
                ? round($originalPrice - self::applyDiscount($originalPrice, $itemDiscountType, $itemDiscountValue), 4)
                : (float) $item['unit_price'];

            $itemSubtotal = round($quantity * $unitPrice, 2);

            // Which specific serial-tracked unit each item sells is picked at
            // confirm time (see SerialSelections/ConfirmSaleAction), not here
            // — a Draft is fully reversible and shouldn't reserve inventory.
            $sale->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $quantity,
                'original_price' => $originalPrice,
                'unit_price' => $unitPrice,
                'discount_type' => $itemDiscountType,
                'discount_value' => $itemDiscountType !== null ? $itemDiscountValue : 0,
                'discount_amount' => round($originalPrice - $unitPrice, 2),
                'subtotal' => $itemSubtotal,
                'installation_required' => $item['installation_required'] ?? false,
                'installation_charge' => $item['installation_charge'] ?? null,
                'note' => $item['note'] ?? null,
            ]);

            $subtotal += $itemSubtotal;

            if ($item['installation_required'] ?? false) {
                $installation += (float) ($item['installation_charge'] ?? 0);
            }
        }

        $subtotal = round($subtotal, 2);

        $discountAmount = self::applyDiscount($subtotal, $sale->discount_type, (float) $sale->discount_value);

        $installation = round($installation, 2);

        return new self($subtotal, $discountAmount, round($subtotal - $discountAmount + $installation, 2), $installation);
    }

    /**
     * The flat/percentage discount math shared by both item-level and
     * invoice-level discounts — a flat amount never exceeds `$base`, a
     * percentage is a share of it, and no type means no discount.
     */
    private static function applyDiscount(float $base, ?DiscountType $type, float $value): float
    {
        return match ($type) {
            DiscountType::Flat => min($value, $base),
            DiscountType::Percentage => round($base * $value / 100, 2),
            default => 0.0,
        };
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
