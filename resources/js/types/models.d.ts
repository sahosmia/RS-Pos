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

export type PurchaseStatusValue = 'draft' | 'ordered' | 'received' | 'cancelled';
export type PaymentStatusValue = 'due' | 'partial' | 'paid';

export interface PurchaseListItem {
    id: number;
    invoice_no: string;
    supplier: { id: number; name: string };
    purchase_date: string;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    payment_status: PaymentStatusValue;
    status: PurchaseStatusValue;
    can_edit: boolean;
}

/** Index signature needed so this array satisfies Inertia's FormDataConvertible constraint in useForm(). */
export interface PurchaseFormItem {
    [key: string]: number | undefined;
    product_id: number;
    quantity: number;
    unit_price: number;
}

export interface PurchaseFormDetail {
    id: number;
    supplier_id: number;
    purchase_date: string;
    status: PurchaseStatusValue;
    items: PurchaseFormItem[];
}

export interface PurchaseItemDetail {
    id: number;
    product: { id: number; name: string; sku: string; track_serial_number: boolean };
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface PurchaseDetail {
    id: number;
    invoice_no: string;
    supplier: { id: number; name: string; phone: string; balance: number };
    purchase_date: string;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    payment_status: PaymentStatusValue;
    status: PurchaseStatusValue;
    can_edit: boolean;
    items: PurchaseItemDetail[];
}

export type SaleStatusValue = 'draft' | 'quotation' | 'confirmed' | 'cancelled';
export type SaleSourceValue = 'manual' | 'imported';

export interface SaleListItem {
    id: number;
    invoice_no: string;
    customer: { id: number; name: string };
    sale_date: string;
    total_amount: number;
    due_amount: number;
    payment_status: PaymentStatusValue;
    status: SaleStatusValue;
    source: SaleSourceValue;
    can_edit: boolean;
}

/** Index signature needed so this array satisfies Inertia's FormDataConvertible constraint in useForm(). */
export interface SaleFormItem {
    [key: string]: number | string | boolean | string[] | null | undefined;
    product_id: number;
    quantity: number;
    unit_price: number;
    installation_required: boolean;
    installation_charge: number | null;
    note: string | null;
    serial_numbers: string[];
}

export interface SaleFormDetail {
    id: number;
    customer_id: number;
    sale_date: string;
    status: SaleStatusValue;
    discount_type: 'flat' | 'percentage' | null;
    discount_value: number;
    valid_until: string | null;
    financing_type: 'one_time' | 'emi';
    items: SaleFormItem[];
}

export interface SaleItemDetail {
    id: number;
    product: { id: number; name: string; sku: string };
    quantity: number;
    original_price: number;
    unit_price: number;
    discount_amount: number;
    subtotal: number;
    installation_required: boolean;
    installation_charge: number | null;
    warranty_expires_at: string | null;
    serial_numbers: string[];
}

export interface SaleDetail {
    id: number;
    invoice_no: string;
    customer: { id: number; name: string; phone: string; balance: number };
    sale_date: string;
    subtotal: number;
    discount_type: 'flat' | 'percentage' | null;
    discount_value: number;
    discount_amount: number;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    payment_status: PaymentStatusValue;
    status: SaleStatusValue;
    source: SaleSourceValue;
    can_edit: boolean;
    items: SaleItemDetail[];
}

export interface CustomerOption {
    id: number;
    name: string;
    balance: number;
}

export interface RecentSaleItem {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
}

export interface RecentSale {
    id: number;
    invoice_no: string;
    sale_date: string;
    total_amount: number;
    items: RecentSaleItem[];
}

export interface ContactPurchaseSummary {
    id: number;
    invoice_no: string;
    purchase_date: string;
    total_amount: number;
    due_amount: number;
    payment_status: PaymentStatusValue;
    status: PurchaseStatusValue;
}

export interface ContactSaleSummary {
    id: number;
    invoice_no: string;
    sale_date: string;
    total_amount: number;
    due_amount: number;
    payment_status: PaymentStatusValue;
    status: SaleStatusValue;
}

export type ChartOfAccountTypeValue = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type NormalBalanceValue = 'debit' | 'credit';

export interface ChartOfAccountOption {
    id: number;
    code: string;
    name: string;
    parent_id?: number | null;
}

export interface ChartOfAccountListItem {
    id: number;
    code: string;
    name: string;
    type: ChartOfAccountTypeValue;
    normal_balance: NormalBalanceValue;
    parent_id: number | null;
    parent: { id: number; name: string } | null;
    balance: number;
    is_active: boolean;
    can_delete: boolean;
}

export interface JournalEntryListItem {
    id: number;
    entry_date: string;
    description: string;
    reference_type: string | null;
    reference_id: number | null;
    status: 'posted' | 'reversed';
    total_debit: number;
    total_credit: number;
}

export interface JournalEntryLineDetail {
    id: number;
    chart_of_account: { id: number; code: string; name: string };
    debit: number;
    credit: number;
    note: string | null;
}

export interface JournalEntryDetail {
    id: number;
    entry_date: string;
    description: string;
    reference_type: string | null;
    reference_id: number | null;
    status: 'posted' | 'reversed';
    reversed_at: string | null;
    reversal_of: { id: number; description: string } | null;
    lines: JournalEntryLineDetail[];
}

export interface AccountingPeriodListItem {
    id: number;
    start_date: string;
    end_date: string;
    status: 'open' | 'closed';
    closed_at: string | null;
    closed_by: { id: number; name: string } | null;
}

export interface GeneralLedgerLine {
    id: number;
    entry_date: string;
    description: string;
    reference_type: string | null;
    reference_id: number | null;
    journal_entry_id: number;
    debit: number;
    credit: number;
    note: string | null;
    balance: number;
}

export interface BackupListItem {
    filename: string;
    date: string;
    size_in_bytes: number;
}

export interface SaleReturnListItem {
    id: number;
    sale: { id: number; invoice_no: string };
    customer: { id: number; name: string };
    return_date: string;
    total_amount: number;
}

export interface ReturnableSaleItem {
    id: number;
    product: { id: number; name: string; sku: string };
    quantity: number;
    unit_price: number;
    already_returned: number;
}

export interface SaleReturnCreateSale {
    id: number;
    invoice_no: string;
    customer: { id: number; name: string };
    items: ReturnableSaleItem[];
}

export interface SaleReturnItemDetail {
    id: number;
    product: { id: number; name: string; sku: string };
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export type SalesOrderStatusValue = 'pending' | 'partial' | 'completed' | 'cancelled';

export interface SalesOrderListItem {
    id: number;
    order_no: string;
    customer: { id: number; name: string };
    order_date: string;
    expected_delivery_date: string | null;
    total_amount: number;
    advance_paid: number;
    due_amount: number;
    status: SalesOrderStatusValue;
    can_convert: boolean;
}

export interface SalesOrderItemDetail {
    id: number;
    product: { id: number; name: string; sku: string };
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface SalesOrderDetail {
    id: number;
    order_no: string;
    customer: { id: number; name: string; phone: string | null; balance: number };
    order_date: string;
    expected_delivery_date: string | null;
    total_amount: number;
    advance_paid: number;
    due_amount: number;
    status: SalesOrderStatusValue;
    can_convert: boolean;
    sale: { id: number; invoice_no: string } | null;
    items: SalesOrderItemDetail[];
}

export interface SaleReturnDetail {
    id: number;
    sale: { id: number; invoice_no: string };
    customer: { id: number; name: string; phone: string; balance: number };
    return_date: string;
    total_amount: number;
    reason: string | null;
    items: SaleReturnItemDetail[];
}

export interface PurchaseReturnListItem {
    id: number;
    purchase: { id: number; invoice_no: string };
    supplier: { id: number; name: string };
    return_date: string;
    total_amount: number;
}

export interface ReturnablePurchaseItem {
    id: number;
    product: { id: number; name: string; sku: string };
    quantity: number;
    unit_price: number;
    already_returned: number;
}

export interface PurchaseReturnCreatePurchase {
    id: number;
    invoice_no: string;
    supplier: { id: number; name: string };
    items: ReturnablePurchaseItem[];
}

export interface PurchaseReturnItemDetail {
    id: number;
    product: { id: number; name: string; sku: string };
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface PurchaseReturnDetail {
    id: number;
    purchase: { id: number; invoice_no: string };
    supplier: { id: number; name: string; phone: string; balance: number };
    return_date: string;
    total_amount: number;
    reason: string | null;
    items: PurchaseReturnItemDetail[];
}
