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

            if ($installment) {
                if ($installment->sale->status !== SaleStatus::Confirmed) {
                    $validator->errors()->add('installment', 'This installment belongs to a sale that is no longer confirmed and can no longer be paid.');
                }

                $remaining = round((float) $installment->amount - (float) $installment->paid_amount, 2);

                if ($remaining <= 0) {
                    $validator->errors()->add('amount', 'This installment has already been fully paid.');
                } else {
                    $amount = (float) $this->input('amount', 0);
                    if ($amount > $remaining + 0.0001) {
                        $validator->errors()->add('amount', 'Payment amount cannot exceed the remaining installment due of ৳'.number_format($remaining, 2).'.');
                    }
                }
            }
        });
    }
}
