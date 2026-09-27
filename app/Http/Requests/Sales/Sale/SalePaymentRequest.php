<?php

namespace App\Http\Requests\Sales\Sale;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared shape for both "confirm with an initial payment" and "add a later
 * payment" — a multi-account split.
 */
class SalePaymentRequest extends FormRequest
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
            'payments' => ['nullable', 'array'],
            'payments.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            // Keyed by sale_item_id — which in-stock unit(s) this line
            // sells, only relevant for a track_serial_number product.
            'serial_numbers' => ['nullable', 'array'],
            'serial_numbers.*' => ['array'],
            'serial_numbers.*.*' => ['string'],
        ];
    }
}
