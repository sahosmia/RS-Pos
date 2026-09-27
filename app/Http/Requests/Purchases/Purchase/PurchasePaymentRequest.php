<?php

namespace App\Http\Requests\Purchases\Purchase;

use App\Models\Purchase;
use App\Rules\CreditAppliedWithinAvailableRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared shape for both "confirm with an initial payment" and "add a later
 * payment" — an optional multi-account split, plus optional supplier
 * credit applied.
 */
class PurchasePaymentRequest extends FormRequest
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
        /** @var Purchase|null $purchase */
        $purchase = $this->route('purchase');

        return [
            'payments' => ['nullable', 'array'],
            'payments.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            'credit_applied' => ['nullable', 'numeric', 'min:0', new CreditAppliedWithinAvailableRule($purchase)],
            // Keyed by purchase_item_id — the serial number of each unit
            // received, only relevant for a track_serial_number product.
            'serial_numbers' => ['nullable', 'array'],
            'serial_numbers.*' => ['array'],
            'serial_numbers.*.*' => ['string'],
        ];
    }
}
