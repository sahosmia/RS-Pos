<?php

namespace App\Rules;

use App\Models\PurchaseItem;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Mirrors ReturnQuantityWithinSoldRule for the purchase side — can't return
 * more of a purchase line than remains after subtracting whatever has
 * already been returned against it.
 */
class ReturnQuantityWithinPurchasedRule implements ValidationRule
{
    public function __construct(private int $purchaseItemId) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $purchaseItem = PurchaseItem::find($this->purchaseItemId);

        if ($purchaseItem === null) {
            return;
        }

        $alreadyReturned = $purchaseItem->returnItems()->sum('quantity');
        $remaining = $purchaseItem->quantity - $alreadyReturned;

        if ((float) $value > $remaining) {
            $fail("Cannot return more than {$remaining} remaining.");
        }
    }
}
