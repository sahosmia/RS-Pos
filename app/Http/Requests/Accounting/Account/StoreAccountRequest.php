<?php

namespace App\Http\Requests\Accounting\Account;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAccountRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'account_type_id' => ['required', 'integer', 'exists:account_types,id'],
            'account_sub_type' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:255'],
            'opening_balance' => ['required', 'numeric'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
