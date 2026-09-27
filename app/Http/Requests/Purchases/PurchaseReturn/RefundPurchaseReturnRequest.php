<?php

namespace App\Http\Requests\Purchases\PurchaseReturn;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RefundPurchaseReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
        ];
    }
}
