<?php

namespace App\Rules;

use App\Models\Purchase;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Supplier credit applied to a purchase (at confirm or later payment time)
 * can never exceed the supplier's actual available credit — a positive
 * Contact.balance means the supplier owes us (receivable), same sign
 * convention `add-payment-modal.tsx`/`confirm-purchase-modal.tsx` use for
 * `supplierCredit` — nor the purchase's own remaining due. Without this, a
 * cashier could type an arbitrary amount and fabricate money.
 */
class CreditAppliedWithinAvailableRule implements ValidationRule
{
    public function __construct(private ?Purchase $purchase) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($this->purchase === null || $value === null || $value === '') {
            return;
        }

        $creditApplied = (float) $value;
        $availableCredit = max((float) $this->purchase->supplier->balance, 0.0);

        if ($creditApplied > $availableCredit + 0.0001) {
            $fail('Cannot apply more credit than the supplier\'s available balance of ৳'.number_format($availableCredit, 2).'.');

            return;
        }

        if ($creditApplied > (float) $this->purchase->due_amount + 0.0001) {
            $fail('Cannot apply more credit than the due amount of ৳'.number_format($this->purchase->due_amount, 2).'.');
        }
    }
}
