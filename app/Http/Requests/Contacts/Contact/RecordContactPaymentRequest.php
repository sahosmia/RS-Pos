<?php

namespace App\Http\Requests\Contacts\Contact;

use App\Models\Contact;
use App\Models\Purchase;
use App\Models\Sale;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RecordContactPaymentRequest extends FormRequest
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
        /** @var Contact $contact */
        $contact = $this->route('contact');

        return [
            'account_id' => ['required', 'integer', 'exists:accounts,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'direction' => ['required', 'in:received,made'],
            'note' => ['nullable', 'string', 'max:255'],
            // When set, the payment settles this specific sale/purchase
            // instead of the contact's general balance — must belong to
            // this contact.
            'sale_id' => ['nullable', 'integer', Rule::exists('sales', 'id')->where('customer_id', $contact->id)],
            'purchase_id' => ['nullable', 'integer', Rule::exists('purchases', 'id')->where('supplier_id', $contact->id)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $saleId = $this->input('sale_id');
            $purchaseId = $this->input('purchase_id');
            $amount = (float) $this->input('amount', 0);

            if ($saleId) {
                $sale = Sale::find($saleId);
                if ($sale && $amount > (float) $sale->due_amount + 0.0001) {
                    $validator->errors()->add('amount', 'Payment amount cannot exceed the sale remaining due amount of ৳'.number_format($sale->due_amount, 2).'.');
                }
            }

            if ($purchaseId) {
                $purchase = Purchase::find($purchaseId);
                if ($purchase && $amount > (float) $purchase->due_amount + 0.0001) {
                    $validator->errors()->add('amount', 'Payment amount cannot exceed the purchase remaining due amount of ৳'.number_format($purchase->due_amount, 2).'.');
                }
            }
        });
    }
}
