<?php

namespace App\Http\Requests\Investor;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class InvestorTransactionRequest extends FormRequest
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
        // Every type but adjustment is a plain magnitude — direction comes
        // from the type itself; adjustment is a signed correction (+ or −).
        $amountRule = $this->input('type') === 'adjustment'
            ? ['required', 'numeric']
            : ['required', 'numeric', 'min:0.01'];

        return [
            'type' => ['required', 'in:investment,profit_share,withdrawal,adjustment'],
            'amount' => $amountRule,
            'account_id' => ['required_if:type,investment,profit_share,withdrawal', 'nullable', 'integer', 'exists:accounts,id'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
