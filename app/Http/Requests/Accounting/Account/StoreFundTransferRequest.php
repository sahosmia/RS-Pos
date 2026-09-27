<?php

namespace App\Http\Requests\Accounting\Account;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreFundTransferRequest extends FormRequest
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
            'from_account_id' => ['required', 'integer', 'exists:accounts,id'],
            'to_account_id' => ['required', 'integer', 'exists:accounts,id', 'different:from_account_id'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'transfer_date' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
