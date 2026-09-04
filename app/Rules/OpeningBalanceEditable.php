<?php

namespace App\Rules;

use App\Models\Account;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Opening balance may only be corrected while the account has no other
 * movement. Afterwards it is locked and an adjustment entry is required.
 */
class OpeningBalanceEditable implements ValidationRule
{
    public function __construct(private Account $account) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ((float) $value === (float) $this->account->opening_balance) {
            return;
        }

        if (! $this->account->canEditOpeningBalance()) {
            $fail('The opening balance can no longer be changed — record an adjustment instead.');
        }
    }
}
