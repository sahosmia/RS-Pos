<?php

namespace App\Http\Requests\Sale;

use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Same shape as SalePaymentRequest, but at least one payment row is
 * required — unlike confirming a sale, "add a payment" with nothing to add
 * doesn't make sense.
 */
class AddSalePaymentRequest extends SalePaymentRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'payments' => ['required', 'array', 'min:1'],
        ]);
    }
}
