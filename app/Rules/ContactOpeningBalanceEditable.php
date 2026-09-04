<?php

namespace App\Rules;

use App\Models\Contact;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Opening balance may only be set while the contact has no ledger entry at
 * all — including its own opening entry. Afterwards it is locked and an
 * adjustment entry is required instead.
 */
class ContactOpeningBalanceEditable implements ValidationRule
{
    public function __construct(private Contact $contact) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ((float) $value === 0.0) {
            return;
        }

        if (! $this->contact->canSetOpeningBalance()) {
            $fail('This contact already has ledger entries — use an adjustment instead.');
        }
    }
}
