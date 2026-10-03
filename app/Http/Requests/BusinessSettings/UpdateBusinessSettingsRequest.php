<?php

namespace App\Http\Requests\BusinessSettings;

use App\Enums\ThemeColor;
use App\Models\Settings;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBusinessSettingsRequest extends FormRequest
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

            // Pagination — the "Rows per page" choices offered on every list page
            'pagination_per_page_options' => ['required', 'array', 'min:1'],
            'pagination_per_page_options.*' => ['integer', 'min:1', 'max:1000', 'distinct'],
            'pagination_default_per_page' => ['required', 'integer', Rule::in($this->input('pagination_per_page_options', []))],
            'pagination_allow_all' => ['required', 'boolean'],

            // Audit — how long activity_logs rows are kept before the monthly retention job prunes them
            'activity_log_retention_months' => ['required', 'integer', Rule::in(Settings::ACTIVITY_LOG_RETENTION_OPTIONS)],

            // Branding — the shop-wide default accent color (users may override their own, see ThemeColorController)
            'theme_color' => ['required', Rule::enum(ThemeColor::class)],

            // Sidebar order — keys are the stable nav keys from resources/js/lib/nav-items.ts
            'menu_order' => ['nullable', 'array:top,sub'],
            'menu_order.top' => ['nullable', 'array'],
            'menu_order.top.*' => ['string', 'max:64', 'distinct'],
            'menu_order.sub' => ['nullable', 'array'],
            'menu_order.sub.*' => ['array'],
            'menu_order.sub.*.*' => ['string', 'max:64', 'distinct'],

            // Quick actions — the Ctrl+Space switcher: which actions show, and the order they cycle in
            'quick_actions' => ['nullable', 'array', 'max:'.count(Settings::QUICK_ACTION_KEYS)],
            'quick_actions.*.key' => ['required', 'string', Rule::in(Settings::QUICK_ACTION_KEYS), 'distinct'],
            'quick_actions.*.enabled' => ['required', 'boolean'],
        ];
    }
}
