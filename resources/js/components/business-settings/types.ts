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
    theme_color: ThemeColorValue;
    menu_order: ReturnType<typeof buildEffectiveMenuOrder>;
    quick_actions: ReturnType<typeof buildEffectiveQuickActions>;
};

export type BusinessSettingsApi = InertiaFormProps<BusinessSettingsData>;
