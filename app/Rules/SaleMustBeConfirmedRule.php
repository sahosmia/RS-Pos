<?php

namespace App\Rules;

use App\Enums\SaleStatus;
use App\Models\Sale;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A return can only reference a sale that actually moved stock/ledger —
 * nothing to reverse on a Draft/Quotation/Cancelled one.
 */
class SaleMustBeConfirmedRule implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $sale = Sale::find($value);

        if ($sale !== null && $sale->status !== SaleStatus::Confirmed) {
            $fail('This sale is not confirmed and cannot be returned against.');
        }
    }
}
