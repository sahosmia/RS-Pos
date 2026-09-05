<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Exceptions\InsufficientStockException;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * The only place a product's cached stock is allowed to move.
 *
 * Every caller records the movement and the quantity together, so
 * `products.current_stock` always equals the sum of its movements.
 */
class StockService
{
    /**
     * Add stock to a product — purchase, sale return, opening stock, or a
     * manual increase adjustment.
     */
    public function increase(
        Product $product,
        float $qty,
        StockMovementType $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $note = null,
    ): StockMovement {
        return DB::transaction(function () use ($product, $qty, $type, $referenceType, $referenceId, $note) {
            $movement = $product->stockMovements()->create([
                'type' => $type,
                'quantity' => $qty,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'note' => $note,
                'created_by' => Auth::id(),
            ]);

            $product->increment('current_stock', $qty);

            return $movement;
        });
    }

    /**
     * Remove stock from a product — sale, purchase return, or a manual
     * decrease adjustment. Locks the product row for the duration of the
     * check-and-decrement so two simultaneous sales of the last unit can't
     * both succeed.
     *
     * @throws InsufficientStockException
     */
    public function decrease(
        Product $product,
        float $qty,
        StockMovementType $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $note = null,
    ): StockMovement {
        return DB::transaction(function () use ($product, $qty, $type, $referenceType, $referenceId, $note) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);

            if ($locked->manage_stock && $locked->current_stock < $qty) {
                throw new InsufficientStockException($locked, $qty);
            }

            $movement = $locked->stockMovements()->create([
                'type' => $type,
                'quantity' => $qty,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'note' => $note,
                'created_by' => Auth::id(),
            ]);

            $locked->decrement('current_stock', $qty);
            $product->refresh();

            return $movement;
        });
    }
}
