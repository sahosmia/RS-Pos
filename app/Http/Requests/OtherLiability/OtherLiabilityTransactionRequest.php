<?php

namespace App\Http\Requests\OtherLiability;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class OtherLiabilityTransactionRequest extends FormRequest
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
        // Every type but adjustment is a plain magnitude — direction comes
        // from the type itself; adjustment is a signed correction (+ or −).
        $amountRule = $this->input('type') === 'adjustment'
            ? ['required', 'numeric']
            : ['required', 'numeric', 'min:0.01'];

        return [
            'type' => ['required', 'in:increase,payment,adjustment'],
            'amount' => $amountRule,
            'account_id' => ['required_if:type,increase,payment', 'nullable', 'integer', 'exists:accounts,id'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
