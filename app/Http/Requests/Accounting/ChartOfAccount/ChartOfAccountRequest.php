<?php

namespace App\Http\Requests\Accounting\ChartOfAccount;

use App\Models\ChartOfAccount;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChartOfAccountRequest extends FormRequest
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
        /** @var ChartOfAccount|null $chartOfAccount */
        $chartOfAccount = $this->route('chart_of_account');

        return [
            'code' => ['required', 'string', 'max:20', Rule::unique('chart_of_accounts', 'code')->ignore($chartOfAccount?->id)],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:asset,liability,equity,income,expense'],
            'normal_balance' => ['required', 'in:debit,credit'],
            'parent_id' => [
                'nullable',
                'integer',
                'exists:chart_of_accounts,id',
                $chartOfAccount ? Rule::notIn([$chartOfAccount->id]) : 'nullable',
            ],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
