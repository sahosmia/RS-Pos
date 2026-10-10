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
            // The account is only needed when money actually moves (a discount on its own settles without cash).
            'account_id' => [Rule::requiredIf(fn () => (float) $this->input('amount', 0) > 0), 'nullable', 'integer', 'exists:accounts,id'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            // Settled together with the payment but with no cash: a discount we give a customer (receivable) or one a supplier gives us (payable).
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
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
            /** @var Contact $contact */
            $contact = $this->route('contact');
            $saleId = $this->input('sale_id');
            $purchaseId = $this->input('purchase_id');
            $amount = (float) $this->input('amount', 0);
            $discount = (float) $this->input('discount_amount', 0);

            if ($amount + $discount < 0.01) {
                $validator->errors()->add('amount', 'Enter a payment amount, a discount, or both.');

                return;
            }

            // A discount only ever shrinks what is owed in the direction being settled — never invents a due.
            if ($discount > 0) {
                $owed = $this->input('direction') === 'received'
                    ? max(0.0, (float) $contact->balance)
                    : max(0.0, -(float) $contact->balance);

                if ($discount > $owed + 0.0001) {
                    $validator->errors()->add('discount_amount', $owed > 0
                        ? 'A discount cannot exceed what is owed (৳'.number_format($owed, 2).').'
                        : 'Nothing is owed in this direction, so there is no due to discount.');
                }
            }

            if ($saleId) {
                $sale = Sale::find($saleId);
                if ($sale && $amount + $discount > (float) $sale->due_amount + 0.0001) {
                    $validator->errors()->add('amount', 'Payment and discount together cannot exceed the sale remaining due amount of ৳'.number_format($sale->due_amount, 2).'.');
                }
            }

            if ($purchaseId) {
                $purchase = Purchase::find($purchaseId);
                if ($purchase && $amount + $discount > (float) $purchase->due_amount + 0.0001) {
                    $validator->errors()->add('amount', 'Payment and discount together cannot exceed the purchase remaining due amount of ৳'.number_format($purchase->due_amount, 2).'.');
                }
            }
        });
    }
}
