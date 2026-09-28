<?php

namespace App\Actions\Purchases\Purchase;

use App\Enums\DiscountType;
use App\Models\Product;
use App\Models\Purchase;

/**
 * Item-level discount lives on each row (original_price vs unit_price);
 * invoice-level discount applies to the post-item-discount subtotal. Shared
 * by CreatePurchaseAction and UpdatePurchaseAction so both compute totals the
 * same way.
 */
class PurchaseTotals
{
    public function __construct(
        public float $subtotal,
        public float $discountAmount,
        public float $totalAmount,
    ) {}

    /**
     * Replaces the purchase's items and computes subtotal/discount_amount/
     * total_amount from them plus the purchase's own discount_type/value.
     *
     * @param  array<int, array{product_id: int, quantity: float|string, original_price?: float|string|null, unit_price: float|string, discount_type?: string|null, discount_value?: float|string|null}>  $items
     */
    public static function sync(Purchase $purchase, array $items): self
    {
        $purchase->items()->delete();

        $subtotal = 0.0;

        foreach ($items as $item) {
            $product = Product::findOrFail($item['product_id']);
            $quantity = (float) $item['quantity'];

            $originalPrice = isset($item['original_price']) ? round((float) $item['original_price'], 4) : (isset($item['unit_price']) ? (float) $item['unit_price'] : $product->avg_cost);

            $itemDiscountType = isset($item['discount_type']) && $item['discount_type'] !== null && $item['discount_type'] !== '' ? DiscountType::from($item['discount_type']) : null;
            $itemDiscountValue = (float) ($item['discount_value'] ?? 0);

            $unitPrice = $itemDiscountType !== null
                ? round($originalPrice - self::applyDiscount($originalPrice, $itemDiscountType, $itemDiscountValue), 4)
                : (float) $item['unit_price'];

            $itemSubtotal = round($quantity * $unitPrice, 2);

            $purchase->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $quantity,
                'original_price' => $originalPrice,
                'unit_price' => $unitPrice,
                'discount_type' => $itemDiscountType,
                'discount_value' => $itemDiscountType !== null ? $itemDiscountValue : 0,
                'discount_amount' => round($originalPrice - $unitPrice, 2),
                'subtotal' => $itemSubtotal,
            ]);

            $subtotal += $itemSubtotal;
        }

        $subtotal = round($subtotal, 2);

        $discountAmount = self::applyDiscount($subtotal, $purchase->discount_type, (float) $purchase->discount_value);

        return new self($subtotal, $discountAmount, round($subtotal - $discountAmount, 2));
    }

    public static function applyDiscount(float $base, ?DiscountType $type, float $value): float
    {
        return match ($type) {
            DiscountType::Flat => min($value, $base),
            DiscountType::Percentage => round($base * $value / 100, 2),
            default => 0.0,
        };
    }

    public function applyTo(Purchase $purchase): void
    {
        $purchase->forceFill([
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discountAmount,
            'total_amount' => $this->totalAmount,
            'due_amount' => $this->totalAmount,
        ])->save();
    }
}
