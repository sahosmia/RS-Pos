<?php

namespace App\Http\Requests\CompanyLoan;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyLoanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `existing` — a loan already running before the system: `loan_amount` is the original
     * amount, `current_balance` what is still owed, no account involved. `new` — money
     * received today into `account_id`, so the balance is simply `loan_amount`.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'loan_type' => ['required', 'in:existing,new'],
            'lender_name' => ['required', 'string', 'max:255'],
            'loan_amount' => ['required', 'numeric', 'min:0.01'],
            'current_balance' => ['exclude_unless:loan_type,existing', 'required', 'nullable', 'numeric', 'min:0.01', 'lte:loan_amount'],
            'account_id' => ['exclude_unless:loan_type,new', 'required', 'nullable', 'integer', 'exists:accounts,id'],
            'interest_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'start_date' => ['required', 'date'],
        ];
    }
}
