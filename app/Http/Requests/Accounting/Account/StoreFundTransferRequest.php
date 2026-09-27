<?php

namespace App\Http\Requests\Accounting\Account;

use App\Models\Account;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $fromAccountId = $this->input('from_account_id');
            $amount = (float) $this->input('amount');

            if ($fromAccountId && $amount > 0) {
                $account = Account::find($fromAccountId);
                if ($account && $account->current_balance < $amount) {
                    $validator->errors()->add('amount', "Insufficient balance in account '{$account->name}'. Current balance: ৳".number_format($account->current_balance, 2));
                }
            }
        });
    }
}
