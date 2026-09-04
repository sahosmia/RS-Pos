<?php

namespace App\Actions\Product;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\StockService;

/**
 * Correct a product's stock to its actual counted quantity — the only
 * route for fixing stock once movements exist (opening stock is locked by
 * then). The difference between the counted quantity and current_stock
 * becomes a single increase or decrease movement.
 */
class AdjustStockAction
{
    public function __construct(private StockService $stock) {}

    public function execute(Product $product, float $countedQuantity, ?string $reason = null): ?StockMovement
    {
        $difference = round($countedQuantity - $product->current_stock, 2);

        if ($difference === 0.0) {
            return null;
        }

        return $difference > 0
            ? $this->stock->increase($product, $difference, StockMovementType::AdjustmentIncrease, note: $reason)
            : $this->stock->decrease($product, abs($difference), StockMovementType::AdjustmentDecrease, note: $reason);
    }
}
