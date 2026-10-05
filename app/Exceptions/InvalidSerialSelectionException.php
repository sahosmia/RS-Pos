<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by ConfirmPurchaseAction/ConfirmSaleAction when a
 * track_serial_number product's serial numbers don't check out — wrong
 * count for the quantity, a duplicate, or (sale side) a serial that isn't
 * currently in_stock for that product.
 *
 * `$itemId` is the sale/purchase line the bad serials were typed on, so a
 * form can show the message under that line's serial field instead of in a
 * generic banner.
 */
class InvalidSerialSelectionException extends RuntimeException
{
    public function __construct(string $message, public readonly ?int $itemId = null)
    {
        parent::__construct($message);
    }
}
