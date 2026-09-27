<?php

namespace App\Http\Requests\Contacts\Contact;

use App\Models\Contact;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
}
