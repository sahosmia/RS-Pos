<?php

namespace App\Http\Requests\CompanyLoan;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class LoanTransactionRequest extends FormRequest
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
            'type' => ['required', 'in:disbursement,repayment,interest_charge,adjustment'],
            'amount' => $amountRule,
            'account_id' => ['required_if:type,disbursement,repayment', 'nullable', 'integer', 'exists:accounts,id'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
