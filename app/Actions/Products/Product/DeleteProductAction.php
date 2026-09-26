<?php

namespace App\Actions\Products\Product;

use App\Models\Product;

class DeleteProductAction
{
    /**
     * Every relation with `restrictOnDelete()` on `product_id` — checked
     * explicitly (not just caught after the fact) so the user gets a
     * specific reason, not a generic failure.
     *
     * @return string|null A human-readable reason, or null if deletion is safe.
     */
    public function blockingReason(Product $product): ?string
    {
        return match (true) {
            $product->stockMovements()->exists() => 'This product has stock movements — mark it inactive instead of deleting it.',
            $product->saleItems()->exists() => 'This product has recorded sales — mark it inactive instead of deleting it.',
            $product->purchaseItems()->exists() => 'This product has recorded purchases — mark it inactive instead of deleting it.',
            $product->serialNumbers()->exists() => 'This product has tracked serial numbers — mark it inactive instead of deleting it.',
            default => null,
        };
    }

    public function execute(Product $product): void
    {
        // The check above should catch every case, but the FK constraint
        // is the real source of truth — this is a deliberate second line
        // of defense, not redundant with blockingReason().
        $product->delete();
    }
}
