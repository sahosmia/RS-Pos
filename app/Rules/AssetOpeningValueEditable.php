<?php

namespace App\Rules;

use App\Models\Asset;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Opening value may only be corrected while the asset has no other
 * movement. Afterwards it is locked and an adjustment (sold/disposal/
 * addition) is required instead.
 */
class AssetOpeningValueEditable implements ValidationRule
{
    public function __construct(private Asset $asset) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ((float) $value === (float) $this->asset->opening_value) {
            return;
        }

        if (! $this->asset->canEditOpeningValue()) {
            $fail('The opening value can no longer be changed — record a transaction instead.');
        }
    }
}
