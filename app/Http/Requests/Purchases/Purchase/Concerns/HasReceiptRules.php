<?php

namespace App\Http\Requests\Purchases\Purchase\Concerns;

use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The extra fields a purchase form sends when it is saved straight as `received`
 * (payment split, supplier credit, serials). The same shape as the "Mark as Received"
 * modal, except serials are keyed by line position — the lines don't have ids yet.
 */
trait HasReceiptRules
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    protected function receiptRules(): array
    {
        return [
            'payments' => ['nullable', 'array'],
            'payments.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            'credit_applied' => ['nullable', 'numeric', 'min:0'],
            'serial_numbers' => ['nullable', 'array'],
            'serial_numbers.*' => ['array'],
            'serial_numbers.*.*' => ['nullable', 'string'],
        ];
    }
}
