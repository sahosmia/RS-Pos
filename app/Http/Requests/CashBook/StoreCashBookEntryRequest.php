<?php

namespace App\Http\Requests\CashBook;

use App\Enums\CashBookEntryType;
use App\Models\CashBookEntry;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCashBookEntryRequest extends FormRequest
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
        $isOpeningBalance = $this->input('type') === CashBookEntryType::OpeningBalance->value;

        return [
            'type' => ['required', Rule::enum(CashBookEntryType::class)],
            'category_id' => [
                $isOpeningBalance ? 'nullable' : 'required',
                'integer',
                Rule::exists('misc_transaction_categories', 'id')->where('type', $this->input('type')),
            ],
            'amount' => ['required', 'numeric', 'gt:0'],
            'entry_date' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * The opening entry is a one-off, same rule as every other module.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $isOpeningBalance = $this->input('type') === CashBookEntryType::OpeningBalance->value;

                if ($isOpeningBalance && CashBookEntry::query()->exists()) {
                    $validator->errors()->add('type', 'The opening balance can only be set while the cash book is empty.');
                }
            },
        ];
    }
}
