<?php

namespace App\Rules;

use App\Models\Investor;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Opening amount may only be corrected while the investor has no other
 * movement. Afterwards it is locked and a transaction is required instead.
 */
class InvestorOpeningAmountEditable implements ValidationRule
{
    public function __construct(private Investor $investor) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ((float) $value === (float) $this->investor->opening_amount) {
            return;
        }

        if (! $this->investor->canEditOpeningAmount()) {
            $fail('The opening balance can no longer be changed — record a transaction instead.');
        }
    }
}
