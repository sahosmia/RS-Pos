<?php

namespace App\Http\Requests\Contacts\Contact;

use App\Enums\ContactPrefix;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContactRequest extends FormRequest
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
            // `name` is still the one required, always-populated display field — the modal composes
            // it from prefix/first/middle/last before submitting, so this contract never changed.
            'name' => ['required', 'string', 'max:255'],
            'prefix' => ['nullable', Rule::enum(ContactPrefix::class)],
            'first_name' => ['nullable', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            // Left blank, `CreateContactAction` auto-generates one from the new row's id.
            'contact_code' => ['nullable', 'string', 'max:50', 'unique:contacts,contact_code'],
            'phone' => ['required', 'string', 'max:30'],
            'phone_alternate' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'shipping_address' => ['nullable', 'string', 'max:1000'],
            'reference' => ['nullable', 'string', 'max:255'],
            'type' => ['required', 'in:customer,supplier,both'],
            'entity_type' => ['required', 'in:individual,business'],
            'business_name' => ['required_if:entity_type,business', 'nullable', 'string', 'max:255'],
            'customer_group_id' => ['nullable', 'integer', 'exists:customer_groups,id'],
            'is_active' => ['required', 'boolean'],
            'opening_balance' => ['nullable', 'numeric'],
        ];
    }
}
