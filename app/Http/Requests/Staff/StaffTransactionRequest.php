<?php

namespace App\Http\Requests\Staff;

use App\Enums\StaffTransactionNature;
use App\Models\StaffTransactionType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StaffTransactionRequest extends FormRequest
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
        $type = StaffTransactionType::find($this->input('staff_transaction_type_id'));
        $needsAccount = $type !== null && in_array($type->nature, [
            StaffTransactionNature::Salary,
            StaffTransactionNature::Settlement,
            StaffTransactionNature::Advance,
            StaffTransactionNature::AdvanceReturn,
        ], true);

        return [
            'staff_transaction_type_id' => ['required', 'integer', 'exists:staff_transaction_types,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'account_id' => [$needsAccount ? 'required' : 'nullable', 'integer', 'exists:accounts,id'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
