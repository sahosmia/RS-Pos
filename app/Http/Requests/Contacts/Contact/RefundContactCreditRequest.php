<?php

namespace App\Http\Requests\Contacts\Contact;

use App\Enums\ContactType;
use App\Models\Contact;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RefundContactCreditRequest extends FormRequest
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
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Only a pure customer's negative balance is credit we hold for them — for
     * a supplier (or a contact that is both) the same number means something
     * else, so a refund there would post against the wrong ledger account.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            /** @var Contact $contact */
            $contact = $this->route('contact');

            if ($contact->type !== ContactType::Customer) {
                $validator->errors()->add('amount', 'A refund can only be made to a customer.');
            }
        });
    }
}
