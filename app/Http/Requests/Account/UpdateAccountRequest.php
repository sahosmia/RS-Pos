<?php

namespace App\Http\Requests\Account;

use App\Models\Account;
use App\Rules\OpeningBalanceEditable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAccountRequest extends FormRequest
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
        /** @var Account $account */
        $account = $this->route('account');

        return [
            'name' => ['required', 'string', 'max:255'],
            'account_type_id' => ['required', 'integer', 'exists:account_types,id'],
            'account_sub_type' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:255'],
            'opening_balance' => ['required', 'numeric', new OpeningBalanceEditable($account)],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
