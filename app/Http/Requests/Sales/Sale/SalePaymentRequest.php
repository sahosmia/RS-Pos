<?php

namespace App\Http\Requests\Sales\Sale;

use App\Enums\SaleStatus;
use App\Models\Sale;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            /** @var Sale|null $sale */
            $sale = $this->route('sale');
            if (! $sale) {
                return;
            }

            $payments = $this->input('payments', []);
            $totalPayment = array_sum(array_map(fn ($p) => (float) ($p['amount'] ?? 0), $payments));

            $maxAllowed = $sale->status === SaleStatus::Confirmed ? (float) $sale->due_amount : (float) $sale->total_amount;

            if ($totalPayment > $maxAllowed + 0.0001) {
                $validator->errors()->add('payments', 'Payment amount cannot exceed the remaining due amount of ৳'.number_format($maxAllowed, 2).'.');
            }
        });
    }
}
