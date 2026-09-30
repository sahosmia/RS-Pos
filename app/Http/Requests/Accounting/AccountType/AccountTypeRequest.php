<?php

namespace App\Http\Requests\Accounting\AccountType;

use App\Models\AccountType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AccountTypeRequest extends FormRequest
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
        /** @var AccountType|null $accountType */
        $accountType = $this->route('account_type');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('account_types', 'name')->ignore($accountType?->id)],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                /** @var AccountType|null $accountType */
                $accountType = $this->route('account_type');

                if ($accountType?->isProtected() && $this->input('name') !== $accountType->name) {
                    $validator->errors()->add('name', "The \"{$accountType->name}\" type is used to route cash accounts in the ledger and cannot be renamed.");
                }
            },
        ];
    }
}
