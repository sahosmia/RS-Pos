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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'lender_name' => ['required', 'string', 'max:255'],
            'loan_amount' => ['required', 'numeric', 'min:0.01'],
            'interest_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'start_date' => ['required', 'date'],
        ];
    }
}
