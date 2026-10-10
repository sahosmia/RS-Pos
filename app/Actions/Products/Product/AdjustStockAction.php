<?php

namespace App\Actions\Products\Product;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

/**
 * Correct a product's stock to its actual counted quantity — the only
 * route for fixing stock once movements exist (opening stock is locked by
 * then). The difference between the counted quantity and current_stock
 * becomes a single increase or decrease movement, with its journal entry.
 *
 * Products that track serial numbers are adjusted unit by unit instead — see AdjustSerialStockAction.
 */
class AdjustStockAction
{
    public function __construct(
        private StockService $stock,
        private PostStockAdjustmentJournal $postJournal,
    ) {}

    public function execute(Product $product, float $countedQuantity, ?string $reason = null, ?float $unitCost = null): ?StockMovement
    {
        return DB::transaction(function () use ($product, $countedQuantity, $reason, $unitCost) {
            $difference = round($countedQuantity - $product->current_stock, 2);

            if ($difference === 0.0) {
                return null;
            }

            $costToUse = $product->avg_cost > 0 ? $product->avg_cost : $unitCost;

            if ($product->avg_cost <= 0 && $costToUse !== null && $costToUse > 0) {
                $product->forceFill(['avg_cost' => round($costToUse, 2)])->save();
            }

            $movement = $difference > 0
                ? $this->stock->increase($product, $difference, StockMovementType::AdjustmentIncrease, note: $reason, unitCost: $costToUse)
                : $this->stock->decrease($product, abs($difference), StockMovementType::AdjustmentDecrease, note: $reason, unitCost: $costToUse);

            $this->postJournal->execute($product, $movement, $difference > 0, $reason);

            return $movement;
        });
    }
}
