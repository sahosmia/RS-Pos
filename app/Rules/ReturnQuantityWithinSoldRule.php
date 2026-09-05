<?php

namespace App\Rules;

use App\Models\SaleItem;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Can't return more of a sale line than remains after subtracting whatever
 * has already been returned against it — this is also what keeps
 * re-submitting the same return request from silently double-processing,
 * since a second attempt would have nothing left to return.
 */
class ReturnQuantityWithinSoldRule implements ValidationRule
{
    public function __construct(private int $saleItemId) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $saleItem = SaleItem::find($this->saleItemId);

        if ($saleItem === null) {
            return;
        }

        $alreadyReturned = $saleItem->returnItems()->sum('quantity');
        $remaining = $saleItem->quantity - $alreadyReturned;

        if ((float) $value > $remaining) {
            $fail("Cannot return more than {$remaining} remaining.");
        }
    }
}
