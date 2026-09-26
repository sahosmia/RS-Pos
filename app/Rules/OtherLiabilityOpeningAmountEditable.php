<?php

namespace App\Rules;

use App\Models\OtherLiability;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Opening amount may only be corrected while the liability has no other
 * movement. Afterwards it is locked and an adjustment is required instead.
 */
class OtherLiabilityOpeningAmountEditable implements ValidationRule
{
    public function __construct(private OtherLiability $otherLiability) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ((float) $value === (float) $this->otherLiability->opening_amount) {
            return;
        }

        if (! $this->otherLiability->canEditOpeningAmount()) {
            $fail('The opening amount can no longer be changed — record a transaction instead.');
        }
    }
}
