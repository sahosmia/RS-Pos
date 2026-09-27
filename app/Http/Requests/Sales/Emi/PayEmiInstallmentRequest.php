<?php

namespace App\Http\Requests\Sales\Emi;

use App\Enums\SaleStatus;
use App\Models\EmiInstallment;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class PayEmiInstallmentRequest extends FormRequest
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
            'account_id' => ['required', 'integer', 'exists:accounts,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    /**
     * A cancelled sale's remaining installments are voided by
     * CancelSaleAction, but this catches the endpoint being hit directly
     * against one that somehow wasn't (or a race between the two requests)
     * before any money moves.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            /** @var EmiInstallment|null $installment */
            $installment = $this->route('emiInstallment');

            if ($installment && $installment->sale->status !== SaleStatus::Confirmed) {
                $validator->errors()->add('installment', 'This installment belongs to a sale that is no longer confirmed and can no longer be paid.');
            }
        });
    }
}
