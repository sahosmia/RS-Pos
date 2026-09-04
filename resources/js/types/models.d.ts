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

export interface AccountType {
    id: number;
    name: string;
}

export interface Account {
    id: number;
    name: string;
    account_type: AccountType;
    account_sub_type: string | null;
    current_balance: number;
    is_active: boolean;
}

export interface AccountListItem {
    id: number;
    name: string;
    account_type_id: number;
    account_type: AccountType;
    account_sub_type: string | null;
    account_number: string | null;
    opening_balance: number;
    current_balance: number;
    is_active: boolean;
    can_delete: boolean;
    /** Opening balance locks as soon as any other movement is recorded. */
    can_edit_opening_balance: boolean;
}

export interface StatementRow {
    id: number;
    type: string;
    amount: number;
    operation_date: string;
    note: string | null;
    reference_type: string | null;
    reference_id: number | null;
    balance: number;
}

export type MiscTransactionCategoryType = 'income' | 'expense';

export interface MiscTransactionCategory {
    id: number;
    name: string;
    type: MiscTransactionCategoryType;
}

export type CashBookEntryType = 'opening_balance' | 'income' | 'expense';

export interface CashBookEntry {
    id: number;
    type: CashBookEntryType;
    category: MiscTransactionCategory | null;
    amount: number;
    note: string | null;
    entry_date: string;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

export interface Category {
    id: number;
    name: string;
    parent_id: number | null;
}

export interface CategoryListItem {
    id: number;
    name: string;
    parent_id: number | null;
    parent: { id: number; name: string } | null;
    products_count: number;
    can_delete: boolean;
}

export interface Unit {
    id: number;
    name: string;
}

export interface UnitListItem {
    id: number;
    name: string;
    products_count: number;
    can_delete: boolean;
}

export interface Brand {
    id: number;
    name: string;
}

export interface BrandListItem {
    id: number;
    name: string;
    products_count: number;
    can_delete: boolean;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductListItem {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    category: { id: number; name: string };
    brand: { id: number; name: string } | null;
    unit: { id: number; name: string };
    avg_cost: number;
    selling_price: number;
    current_stock: number;
    minimum_stock_level: number;
    stock_status: StockStatus;
    profit_margin: number;
    manage_stock: boolean;
    is_for_sale: boolean;
    is_active: boolean;
    can_set_opening_stock: boolean;
    image_url: string | null;
}

export interface ProductDetail {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    category_id: number;
    brand_id: number | null;
    unit_id: number;
    selling_price: number;
    minimum_stock_level: number;
    manage_stock: boolean;
    is_for_sale: boolean;
    is_active: boolean;
    warranty_period_months: number | null;
    has_installation_service: boolean;
    emi_available: boolean;
    track_serial_number: boolean;
    current_stock: number;
    can_set_opening_stock: boolean;
    image_url: string | null;
}

export type ContactType = 'customer' | 'supplier' | 'both';
export type ContactEntityType = 'individual' | 'business';

export interface CustomerGroup {
    id: number;
    name: string;
}

export interface CustomerGroupListItem {
    id: number;
    name: string;
    contacts_count: number;
    can_delete: boolean;
}

export interface ContactListItem {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    type: ContactType;
    entity_type: ContactEntityType;
    business_name: string | null;
    customer_group: { id: number; name: string } | null;
    balance: number;
    balance_label: string;
    is_active: boolean;
    can_delete: boolean;
    can_set_opening_balance: boolean;
}

export interface ContactDetail {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    shipping_address: string | null;
    type: ContactType;
    entity_type: ContactEntityType;
    business_name: string | null;
    customer_group_id: number | null;
    customer_group: { id: number; name: string } | null;
    balance: number;
    balance_label: string;
    is_active: boolean;
    can_set_opening_balance: boolean;
}

export interface ContactLedgerEntry {
    id: number;
    type: string;
    amount: number;
    note: string | null;
    reference_type: string | null;
    reference_id: number | null;
    created_at: string;
    balance: number;
}

export interface ContactDocument {
    id: number;
    name: string;
    file_name: string;
    size: number;
    url: string;
    created_at: string;
}
