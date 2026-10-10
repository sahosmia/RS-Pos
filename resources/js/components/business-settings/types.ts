import { type buildEffectiveMenuOrder } from '@/components/menu-order-editor';
import { type buildEffectiveQuickActions } from '@/lib/quick-actions';
import { type ThemeColorValue } from '@/lib/theme-colors';
import { type InertiaFormProps } from '@inertiajs/react';

/** Everything the Business Settings form submits. */
export type BusinessSettingsData = {
    shop_name: string;
    shop_address: string;
    shop_phone: string;
    currency_symbol: string;
    invoice_prefix: string;
    invoice_next_number: number;
    purchase_prefix: string;
    purchase_next_number: number;
    fiscal_year_start_month: number;
    thermal_printer_enabled: boolean;
    emi_module_enabled: boolean;
    serial_number_module_enabled: boolean;
    pagination_per_page_options: number[];
    pagination_default_per_page: number;
    pagination_allow_all: boolean;
    activity_log_retention_months: number;
    sms_enabled: boolean;
    sms_gateway_url: string;
    sms_http_method: string;
    sms_api_key: string;
    sms_auth_mode: string;
    sms_sender_id: string;
    sms_api_key_param: string;
    sms_sender_param: string;
    sms_phone_param: string;
    sms_message_param: string;
    sms_extra_params: string;
    sms_phone_format: string;
    sms_success_text: string;
    theme_color: ThemeColorValue;
    menu_order: ReturnType<typeof buildEffectiveMenuOrder>;
    quick_actions: ReturnType<typeof buildEffectiveQuickActions>;
};

export type BusinessSettingsApi = InertiaFormProps<BusinessSettingsData>;
