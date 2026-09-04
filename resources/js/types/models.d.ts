export interface Settings {
    id: number;
    shop_name: string;
    shop_logo: string | null;
    shop_address: string | null;
    shop_phone: string | null;
    currency_symbol: string;
    invoice_prefix: string;
    invoice_next_number: number;
    purchase_prefix: string;
    purchase_next_number: number;
    thermal_printer_enabled: boolean;
    emi_module_enabled: boolean;
    serial_number_module_enabled: boolean;
    fiscal_year_start_month: number;
}
