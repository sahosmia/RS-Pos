<?php

namespace App\Http\Requests\Contact;

use App\Models\Contact;
use App\Rules\ContactOpeningBalanceEditable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateContactRequest extends FormRequest
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
        /** @var Contact $contact */
        $contact = $this->route('contact');

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'shipping_address' => ['nullable', 'string', 'max:1000'],
            'type' => ['required', 'in:customer,supplier,both'],
            'entity_type' => ['required', 'in:individual,business'],
            'business_name' => ['required_if:entity_type,business', 'nullable', 'string', 'max:255'],
            'customer_group_id' => ['nullable', 'integer', 'exists:customer_groups,id'],
            'is_active' => ['required', 'boolean'],
            'opening_balance' => ['nullable', 'numeric', new ContactOpeningBalanceEditable($contact)],
        ];
    }
}
