<?php

namespace App\Http\Requests\InvoiceSettings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceSettingsRequest extends FormRequest
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
            'general' => ['required', 'array'],
            'general.title' => ['required', 'string', 'max:100'],
            'general.subtitle' => ['nullable', 'string', 'max:150'],
            'general.show_number' => ['required', 'boolean'],
            'general.show_date' => ['required', 'boolean'],
            'general.show_due_date' => ['required', 'boolean'],

            'branding' => ['required', 'array'],
            'branding.show_logo' => ['required', 'boolean'],
            'logo' => ['nullable', 'image', 'max:2048'],

            'business' => ['required', 'array'],
            'business.show_name' => ['required', 'boolean'],
            'business.show_address' => ['required', 'boolean'],
            'business.show_phone' => ['required', 'boolean'],

            'customer' => ['required', 'array'],
            'customer.show_name' => ['required', 'boolean'],
            'customer.show_phone' => ['required', 'boolean'],
            'customer.show_email' => ['required', 'boolean'],
            'customer.show_address' => ['required', 'boolean'],

            'items' => ['required', 'array'],
            'items.show_sku' => ['required', 'boolean'],
            'items.show_unit' => ['required', 'boolean'],
            'items.show_discount' => ['required', 'boolean'],

            'totals' => ['required', 'array'],
            'totals.show_discount' => ['required', 'boolean'],
            'totals.show_paid' => ['required', 'boolean'],
            'totals.show_due' => ['required', 'boolean'],

            'terms' => ['required', 'array'],
            'terms.enabled' => ['required', 'boolean'],
            'terms.items' => ['array'],
            'terms.items.*' => ['string', 'max:255'],

            'footer' => ['required', 'array'],
            'footer.enabled' => ['required', 'boolean'],
            'footer.text' => ['nullable', 'string', 'max:255'],
        ];
    }
}
