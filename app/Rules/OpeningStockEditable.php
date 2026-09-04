<?php

namespace App\Rules;

use App\Models\Product;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Opening stock may only be set while the product has no stock movement at
 * all — including its own opening entry. Afterwards it is locked and a
 * Stock Adjustment is required instead.
 */
class OpeningStockEditable implements ValidationRule
{
    public function __construct(private Product $product) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ((float) $value === 0.0) {
            return;
        }

        if (! $this->product->canSetOpeningStock()) {
            $fail('This product already has stock movements — use Stock Adjustment instead.');
        }
    }
}
