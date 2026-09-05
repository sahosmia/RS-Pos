<?php

namespace App\Http\Requests\Purchase;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared shape for both "confirm with an initial payment" and "add a later
 * payment" — an optional multi-account split, plus optional supplier
 * credit applied.
 */
class PurchasePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'payments' => ['nullable', 'array'],
            'payments.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            'credit_applied' => ['nullable', 'numeric', 'min:0'],
            // Keyed by purchase_item_id — the serial number of each unit
            // received, only relevant for a track_serial_number product.
            'serial_numbers' => ['nullable', 'array'],
            'serial_numbers.*' => ['array'],
            'serial_numbers.*.*' => ['string'],
        ];
    }
}
