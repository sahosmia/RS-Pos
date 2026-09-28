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
    pagination_per_page_options: number[];
    pagination_default_per_page: number;
    pagination_allow_all: boolean;
    activity_log_retention_months: number;
    theme_color: string;
    menu_order: { top: string[]; sub: Record<string, string[]> } | null;
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
    is_default: boolean;
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
    is_default: boolean;
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
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
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
    category: { id: number; name: string } | null;
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
    category_id: number | null;
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
    service_plan: ServicePlanPeriod[];
}

export interface ServicePlanPeriod {
    period_months: number;
    free_quota: number;
}

export type ContactType = 'customer' | 'supplier' | 'both';
export type ContactEntityType = 'individual' | 'business';
export type ContactPrefixValue = 'mr' | 'mrs' | 'ms' | 'dr' | 'mx';
export type MessageChannel = 'sms' | 'whatsapp' | 'email';

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

/**
 * The structured-identity fields the Contact create/edit modal captures —
 * shared by `ContactListItem` (the primary "open for edit" source, on the
 * list page) and `ContactDetail` (the contact show page, which can also
 * open the same modal). `name` stays the single always-populated identity
 * field; these are additional structure the backend composes it from.
 * `display_name` (business_name when set, else name) is the one to render
 * as the primary label — see the Contact model's `display_name` accessor.
 */
interface ContactProfileFields {
    prefix: ContactPrefixValue | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    contact_code: string | null;
    phone_alternate: string | null;
    reference: string | null;
}

export interface ContactListItem extends ContactProfileFields {
    id: number;
    name: string;
    display_name: string;
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
    can_delete: boolean;
    can_set_opening_balance: boolean;
}

export interface ContactDetail extends ContactProfileFields {
    id: number;
    name: string;
    display_name: string;
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

export interface ContactLedgerLineItem {
    product: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface ContactLedgerEntry {
    id: number;
    type: string;
    amount: number;
    note: string | null;
    reference_type: string | null;
    reference_id: number | null;
    /** e.g. the sale/purchase invoice number, sales order number, expense category, or account name — resolved server-side from `reference_type`/`reference_id`. */
    reference_label: string | null;
    /** Product line items for sale/purchase/return/sales-order entries — empty for payments, opening balance, adjustments, etc. */
    items: ContactLedgerLineItem[];
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
    [key: string]: number | string | null | undefined;
    product_id: number;
    quantity: number;
    original_price?: number;
    unit_price: number;
    discount_type?: 'flat' | 'percentage' | null;
    discount_value?: number;
}

export interface PurchaseFormDetail {
    id: number;
    supplier_id: number;
    purchase_date: string;
    status: PurchaseStatusValue;
    discount_type?: 'flat' | 'percentage' | null;
    discount_value?: number;
    items: PurchaseFormItem[];
}

/** Matches `ProductSearchController`'s response shape (doc/corrections2.md #8) — same for a search result or an edit form's already-picked product. */
export interface PurchaseProductOption {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    selling_price: number;
    avg_cost: number;
    current_stock: number;
    track_serial_number: boolean;
    has_installation_service: boolean;
}

/** Matches `ContactSearchController`'s response shape. */
export interface SupplierOption {
    id: number;
    name: string;
    display_name: string;
    phone: string | null;
    business_name: string | null;
    balance: number;
}

export interface PurchaseItemDetail {
    id: number;
    product: { id: number; name: string; sku: string; track_serial_number: boolean };
    quantity: number;
    original_price?: number;
    unit_price: number;
    discount_type?: 'flat' | 'percentage' | null;
    discount_value?: number;
    discount_amount?: number;
    subtotal: number;
}

export interface PurchaseDetail {
    id: number;
    invoice_no: string;
    supplier: { id: number; name: string; phone: string; balance: number };
    creator?: { id: number; name: string } | null;
    purchase_date: string;
    subtotal?: number;
    discount_type?: 'flat' | 'percentage' | null;
    discount_value?: number;
    discount_amount?: number;
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
    /** The editable per-line base price a discount is computed against — defaults to the product's catalog price, but can be overridden per sale. */
    original_price: number;
    unit_price: number;
    discount_type: 'flat' | 'percentage' | null;
    discount_value: number;
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
    installment_count: number | null;
    items: SaleFormItem[];
}

export type EmiInstallmentStatusValue = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface EmiInstallmentListItem {
    id: number;
    invoice_no: string;
    customer: { id: number; name: string };
    installment_number: number;
    due_date: string;
    amount: number;
    paid_amount: number;
    status: EmiInstallmentStatusValue;
}

export interface SaleItemDetail {
    id: number;
    product: { id: number; name: string; sku: string };
    quantity: number;
    original_price: number;
    unit_price: number;
    discount_type: 'flat' | 'percentage' | null;
    discount_value: number;
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
    creator?: { id: number; name: string } | null;
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
    payment_history: SalePaymentHistoryEntry[];
    items: SaleItemDetail[];
}

export interface SalePaymentHistoryEntry {
    id: number;
    date: string;
    account: string;
    amount: number;
    kind: 'payment' | 'refund';
}

/** Matches `ContactSearchController`'s response shape (same as `SupplierOption`, kept separate for readability at call sites). */
export interface CustomerOption {
    id: number;
    name: string;
    display_name: string;
    phone: string | null;
    business_name: string | null;
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
    /** True when this entry is itself a reversal of another — it can never be reversed again. */
    is_reversal: boolean;
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

export interface ExpenseCategoryOption {
    id: number;
    name: string;
    parent_id: number | null;
}

export interface ExpenseCategoryListItem {
    id: number;
    name: string;
    parent_id: number | null;
    parent: { id: number; name: string } | null;
    expenses_count: number;
    can_delete: boolean;
}

export interface ExpenseAttachment {
    url: string;
    name: string;
}

export interface ExpenseListItem {
    id: number;
    category: { id: number; name: string };
    contact: { id: number; name: string } | null;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    payment_status: PaymentStatusValue;
    expense_date: string;
    due_date: string | null;
    note: string | null;
    can_edit: boolean;
    attachment: ExpenseAttachment | null;
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
    refunded_amount: number;
    remaining_refundable: number;
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
    refunded_amount: number;
    remaining_refundable: number;
    reason: string | null;
    items: PurchaseReturnItemDetail[];
}

/** Shared shape for the Asset/Company Loan/Investor/Other Liability ledger — same running-balance table on every Detail page. */
export interface LedgerTransactionRow {
    id: number;
    type: string;
    amount: number;
    account: { id: number; name: string } | null;
    note: string | null;
    created_at: string;
    balance: number;
}

export type AssetTransactionTypeValue = 'opening_asset' | 'purchase' | 'addition' | 'sold' | 'disposal' | 'adjustment';

export interface AssetListItem {
    id: number;
    name: string;
    category: string | null;
    opening_value: number;
    current_value: number;
    purchase_date: string | null;
    can_delete: boolean;
    can_edit_opening_value: boolean;
}

export interface AssetDetail {
    id: number;
    name: string;
    category: string | null;
    current_value: number;
    purchase_date: string | null;
}

export type LoanTransactionTypeValue = 'disbursement' | 'repayment' | 'interest_charge' | 'adjustment';

export interface CompanyLoanListItem {
    id: number;
    lender_name: string;
    loan_amount: number;
    interest_rate: number | null;
    outstanding_balance: number;
    start_date: string;
    can_delete: boolean;
}

export interface CompanyLoanDetail {
    id: number;
    lender_name: string;
    loan_amount: number;
    interest_rate: number | null;
    outstanding_balance: number;
    start_date: string;
}

export type InvestorTransactionTypeValue = 'investment' | 'profit_share' | 'withdrawal' | 'adjustment';

export interface InvestorListItem {
    id: number;
    name: string;
    total_invested: number;
    can_delete: boolean;
}

export interface InvestorDetail {
    id: number;
    name: string;
    total_invested: number;
}

export type OtherLiabilityTransactionTypeValue = 'opening_liability' | 'increase' | 'payment' | 'adjustment';

export interface OtherLiabilityListItem {
    id: number;
    name: string;
    opening_amount: number;
    current_balance: number;
    can_delete: boolean;
    can_edit_opening_amount: boolean;
}

export interface OtherLiabilityDetail {
    id: number;
    name: string;
    current_balance: number;
}

export type StaffStatusValue = 'active' | 'inactive';
export type BalanceEffectValue = 'increase' | 'decrease';
export type StaffTransactionNatureValue = 'expense' | 'settlement' | 'advance' | 'advance_return' | 'adjustment';

export interface StaffTransactionTypeOption {
    id: number;
    name: string;
    effect_on_balance: BalanceEffectValue;
    nature: StaffTransactionNatureValue;
}

export interface StaffListItem {
    id: number;
    name: string;
    phone: string | null;
    designation: string | null;
    joining_date: string | null;
    salary_amount: number;
    status: StaffStatusValue;
    investor: { id: number; name: string } | null;
    balance: number;
    can_delete: boolean;
}

export interface StaffDetail {
    id: number;
    name: string;
    phone: string | null;
    designation: string | null;
    salary_amount: number;
    balance: number;
    balance_label: string;
}

export interface StaffLedgerRow {
    id: number;
    type: { id: number; name: string };
    amount: number;
    account: { id: number; name: string } | null;
    note: string | null;
    created_at: string;
    balance: number;
}

export type ServiceRequestTypeValue = 'installation' | 'service';
export type ServiceRequestStatusValue = 'pending' | 'scheduled' | 'completed' | 'cancelled';
export type WarrantyClaimStatusValue = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface ServiceRequestListItem {
    id: number;
    product: { id: number; name: string; sku: string };
    invoice_no: string;
    customer: { id: number; name: string };
    type: ServiceRequestTypeValue;
    is_free: boolean;
    charge_amount: number;
    staff: { id: number; name: string } | null;
    status: ServiceRequestStatusValue;
    request_date: string;
}

export interface ServiceableSaleItem {
    id: number;
    product: { id: number; name: string; sku: string };
    invoice_no: string;
    customer: { id: number; name: string };
    is_next_free: boolean;
}

export interface WarrantyableSaleItem {
    id: number;
    product: { id: number; name: string; sku: string };
    invoice_no: string;
    customer: { id: number; name: string };
    warranty_expires_at: string | null;
}

export interface WarrantyClaimListItem {
    id: number;
    product: { id: number; name: string; sku: string };
    invoice_no: string;
    customer: { id: number; name: string };
    warranty_expires_at: string | null;
    claim_date: string;
    issue_description: string;
    status: WarrantyClaimStatusValue;
    resolution_note: string | null;
}

export interface QuickAction {
    label: string;
    href: string;
}

/** Keep in sync with `App\Enums\DateRangePreset`. */
export type DateRangePresetValue =
    | 'today'
    | 'yesterday'
    | 'last_7_days'
    | 'last_30_days'
    | 'this_month'
    | 'last_month'
    | 'this_month_last_year'
    | 'this_year'
    | 'last_year'
    | 'custom';

export interface DashboardRange {
    preset: DateRangePresetValue;
    from: string;
    to: string;
}

/** Sales/Purchases & Expenses cards — filtered by `DashboardRange` (doc/corrections2.md #4). */
export interface DashboardMetrics {
    totalSales: number;
    netSales: number;
    invoiceDue: number;
    totalSellReturn: number;
    totalPurchase: number;
    purchaseDue: number;
    totalPurchaseReturn: number;
    totalExpense: number;
}

/** Point-in-time balances (Chart-of-Accounts-sourced) — not affected by the date filter. */
export interface DashboardBalances {
    totalReceivable: number;
    totalPayable: number;
    cashAndBank: number;
    lowStockCount: number;
}

export interface DashboardDailySalesPoint {
    date: string;
    total: number;
}

export interface DashboardMonthlySalesPoint {
    month: string;
    label: string;
    total: number;
}

export interface DashboardRevenueExpensePoint {
    month: string;
    label: string;
    revenue: number;
    expense: number;
}

/** Subset of `DateRangePresetValue` accepted by the best-sellers/purchases widget's own `period` filter. */
export type BestSellersPeriodValue = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days';

export interface DashboardBestSellerItem {
    id: number;
    name: string;
    sku: string;
    quantity: number;
    total_amount: number;
}

/** Shared row shape for `recentTransactions.{sales,purchases,expenses}` on the dashboard. */
export interface DashboardRecentTransactionRow {
    id: number;
    invoice_no: string;
    party_name: string;
    amount: number;
    status: string;
    date: string;
    href: string;
}

export interface DashboardRecentTransactions {
    sales: DashboardRecentTransactionRow[];
    purchases: DashboardRecentTransactionRow[];
    expenses: DashboardRecentTransactionRow[];
}

export interface ChartOfAccountLine {
    id: number;
    code: string;
    name: string;
    amount: number;
}

export interface BalanceSheetAccountRow {
    id: number;
    code: string;
    name: string;
    balance: number;
}

export interface QuickBalanceSheet {
    receivable: number;
    payable: number;
    inventory: number;
    cashAndBank: number;
}

export interface FullFinancialPosition {
    assets: BalanceSheetAccountRow[];
    liabilities: BalanceSheetAccountRow[];
    equity: BalanceSheetAccountRow[];
    netProfit: number;
    assetsTotal: number;
    liabilitiesAndEquityTotal: number;
}

/** One as-of-date section of `FinancialPositionReportData` — e.g. Sundry Debtors, Cash at Bank. */
export interface FinancialPositionSection {
    total: number;
    breakdown: { name: string; amount: number }[];
}

/** `FinancialPositionReport::forEndDate()` — the ledger-per-module report, distinct from `FullFinancialPosition` (Chart-of-Accounts based). */
export interface FinancialPositionReportData {
    end_date: string;
    assets: {
        closing_stock: FinancialPositionSection;
        sundry_debtors: FinancialPositionSection;
        staff_advances: FinancialPositionSection;
        cash_and_bank: FinancialPositionSection;
        other_assets: FinancialPositionSection;
        total: number;
    };
    liabilities: {
        investor_capital: FinancialPositionSection;
        company_loans: FinancialPositionSection;
        sundry_creditors: FinancialPositionSection;
        other_liabilities: FinancialPositionSection;
        net_profit: number;
        total: number;
    };
}

export interface TrialBalanceRow {
    id: number;
    code: string;
    name: string;
    debit: number;
    credit: number;
}

export interface CashFlowTypeRow {
    type: string;
    total: number;
}

export interface StockReportRow {
    id: number;
    name: string;
    sku: string;
    current_stock: number;
    avg_cost: number;
    stock_value: number;
    stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface DueRow {
    id: number;
    name: string;
    phone?: string;
    balance: number;
}

export interface TrendingProductRow {
    id: number;
    name: string;
    sku: string;
    quantity_sold: number;
    revenue: number;
}

export interface PermissionOption {
    id: number;
    name: string;
    action: string;
}

export interface RoleListItem {
    id: number;
    name: string;
    users_count: number;
    permissions: string[];
    protected: boolean;
}

export interface RoleUserListItem {
    id: number;
    name: string;
    email: string;
    username: string | null;
    is_active: boolean;
    roles: string[];
    can_delete: boolean;
}
