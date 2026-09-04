<?php

namespace App\Http\Requests\BusinessSettings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateBusinessSettingsRequest extends FormRequest
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
        return [
            // Business
            'shop_name' => ['required', 'string', 'max:255'],
            'shop_address' => ['nullable', 'string', 'max:500'],
            'shop_phone' => ['nullable', 'string', 'max:20'],
            'currency_symbol' => ['required', 'string', 'max:5'],

            // Invoice
            'invoice_prefix' => ['required', 'string', 'max:20'],
            'invoice_next_number' => ['required', 'integer', 'min:1'],
            'purchase_prefix' => ['required', 'string', 'max:20'],
            'purchase_next_number' => ['required', 'integer', 'min:1'],
            'fiscal_year_start_month' => ['required', 'integer', 'between:1,12'],

            // Modules
            'thermal_printer_enabled' => ['required', 'boolean'],
            'emi_module_enabled' => ['required', 'boolean'],
            'serial_number_module_enabled' => ['required', 'boolean'],
        ];
    }
}
