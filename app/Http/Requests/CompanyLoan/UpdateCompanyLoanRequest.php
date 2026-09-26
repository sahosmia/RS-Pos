<?php

namespace App\Http\Requests\CompanyLoan;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Same rules as creation — `loan_amount`/`interest_rate` are purely
 * informational (the originally agreed terms), never recalculated, so
 * unlike Account/Asset/OtherLiability's opening balance there's nothing to
 * lock once transactions exist.
 */
class UpdateCompanyLoanRequest extends FormRequest
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
            'lender_name' => ['required', 'string', 'max:255'],
            'loan_amount' => ['required', 'numeric', 'min:0.01'],
            'interest_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'start_date' => ['required', 'date'],
        ];
    }
}
