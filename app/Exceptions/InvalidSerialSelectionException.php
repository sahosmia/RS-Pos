<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by ConfirmPurchaseAction/ConfirmSaleAction when a
 * track_serial_number product's serial numbers don't check out — wrong
 * count for the quantity, a duplicate, or (sale side) a serial that isn't
 * currently in_stock for that product.
 */
class InvalidSerialSelectionException extends RuntimeException {}
