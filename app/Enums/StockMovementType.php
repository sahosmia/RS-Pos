<?php

namespace App\Enums;

/**
 * Every way a product's stock can move.
 *
 * Kept as the single reference list for `stock_movements.type`, mirroring
 * AccountTransactionType — new modules add their own case here rather than
 * inventing a raw string.
 */
enum StockMovementType: string
{
    case OpeningStock = 'opening_stock';
    case Purchase = 'purchase';
    case Sale = 'sale';
    case SaleReturn = 'sale_return';
    case PurchaseReturn = 'purchase_return';
    case AdjustmentIncrease = 'adjustment_increase';
    case AdjustmentDecrease = 'adjustment_decrease';

    /**
     * Whether this type adds to stock (true) or removes from it (false).
     */
    public function increasesStock(): bool
    {
        return match ($this) {
            self::OpeningStock, self::Purchase, self::SaleReturn, self::AdjustmentIncrease => true,
            self::Sale, self::PurchaseReturn, self::AdjustmentDecrease => false,
        };
    }
}
