<?php

namespace App\Exceptions;

use App\Models\Product;
use RuntimeException;

/**
 * Thrown by StockService::decrease() when a stock-managed product doesn't
 * have enough current_stock left to cover the requested quantity — checked
 * under a row lock so two simultaneous sales of the last unit can't both
 * succeed.
 */
class InsufficientStockException extends RuntimeException
{
    public function __construct(Product $product, float $requested)
    {
        parent::__construct("Insufficient stock for \"{$product->name}\": {$requested} requested, {$product->current_stock} available.");
    }
}
