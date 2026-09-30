<?php

namespace App\Http\Requests\Accounting\Account;

use App\Models\Account;
use App\Rules\OpeningBalanceEditable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAccountRequest extends FormRequest
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
        /** @var Account $account */
        $account = $this->route('account');

        return [
            'name' => ['required', 'string', 'max:255'],
            'account_type_id' => ['nullable', 'integer', 'exists:account_types,id'],
            'account_sub_type' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:255'],
            'opening_balance' => ['nullable', 'numeric', 'min:0', new OpeningBalanceEditable($account)],
            'is_active' => ['required', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
