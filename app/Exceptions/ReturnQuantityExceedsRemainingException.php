<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by CreateSaleReturnAction/CreatePurchaseReturnAction when a line's
 * requested return quantity exceeds what's left after prior returns — the
 * same check StoreSaleReturnRequest/StorePurchaseReturnRequest run via
 * ReturnQuantityWithin{Sold,Purchased}Rule, repeated here so the Action is
 * safe to call directly too, and so re-submitting an identical request
 * can't double-process the same units.
 */
class ReturnQuantityExceedsRemainingException extends RuntimeException {}
