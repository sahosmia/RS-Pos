<?php

namespace App\Rules;

use App\Enums\PurchaseStatus;
use App\Models\Purchase;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A return can only reference a purchase that actually moved stock/ledger —
 * nothing to reverse on a Draft/Ordered/Cancelled one.
 */
class PurchaseMustBeReceivedRule implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $purchase = Purchase::find($value);

        if ($purchase !== null && $purchase->status !== PurchaseStatus::Received) {
            $fail('This purchase is not received and cannot be returned against.');
        }
    }
}
