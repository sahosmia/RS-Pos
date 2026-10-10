import { type useTranslation } from '@/hooks/use-translation';
import { type NavItem } from '@/types';
import {
    Banknote,
    BarChart3,
    BookText,
    HandCoins,
    IdCard,
    KeyRound,
    Landmark,
    LayoutGrid,
    Package,
    Receipt,
    Settings,
    ShieldCheck,
    ShoppingCart,
    Users,
    Wallet,
    Wrench,
} from 'lucide-react';

/**
 * The app's full sidebar menu tree — the single source of truth for both
 * `AppSidebar` (which renders it, after permission-filtering and applying
 * the admin-configured order) and the Business Settings "Menu Order" tab
 * (which only needs each item's `key`/`title`/`items`, not its icon/url/
 * permission, to offer reordering). Every item's `key` is what
 * `resources/js/lib/menu-order.ts` sorts by — it must stay stable across
 * releases so a saved order doesn't silently stop applying.
 */
export function buildMainNavItems(emiModuleEnabled: boolean, t: ReturnType<typeof useTranslation>['t']): NavItem[] {
    return [
        {
            key: 'dashboard',
            title: t('nav', 'dashboard'),
            url: '/dashboard',
            icon: LayoutGrid,
        },
        {
            key: 'sales',
            title: t('nav', 'sales'),
            url: '/sales',
            icon: Receipt,
            permission: 'sale.view_own',
            items: [
                { key: 'sales', title: t('nav', 'sales'), url: '/sales' },
                { key: 'add_sale', title: t('nav', 'add_sale'), url: '/sales/create', permission: 'sale.create' },
                { key: 'draft_sales', title: t('nav', 'draft_sales'), url: '/sales?status=draft', permission: 'sale.view_own' },
                { key: 'sale_returns', title: t('nav', 'sale_returns'), url: '/sale-returns' },
                { key: 'sales_order', title: t('nav', 'sales_order'), url: '/sales-orders' },
                ...(emiModuleEnabled ? [{ key: 'emi_installments', title: t('nav', 'emi_installments'), url: '/emi-installments' }] : []),
            ],
        },
        {
            key: 'purchases',
            title: t('nav', 'purchases'),
            url: '/purchases',
            icon: ShoppingCart,
            permission: 'purchase.view_own',
            items: [
                { key: 'purchases', title: t('nav', 'purchases'), url: '/purchases' },
                { key: 'add_purchase', title: t('nav', 'add_purchase'), url: '/purchases/create', permission: 'purchase.create' },
                { key: 'purchase_returns', title: t('nav', 'purchase_returns'), url: '/purchase-returns' },
            ],
        },
        {
            key: 'product',
            title: t('nav', 'product'),
            url: '/products',
            icon: Package,
            permission: 'product.view',
            items: [
                { key: 'products', title: t('nav', 'products'), url: '/products' },
                { key: 'add_product', title: t('nav', 'add_product'), url: '/products/create', permission: 'product.create' },
                { key: 'category', title: t('nav', 'category'), url: '/categories' },
                { key: 'unit', title: t('nav', 'unit'), url: '/units' },
                { key: 'brand', title: t('nav', 'brand'), url: '/brands' },
            ],
        },
        {
            key: 'contact',
            title: t('nav', 'contact'),
            url: '/contacts',
            icon: Users,
            permission: 'contact.view',
            items: [
                { key: 'supplier', title: t('nav', 'supplier'), url: '/contacts?type=supplier' },
                { key: 'customer', title: t('nav', 'customer'), url: '/contacts?type=customer' },
                { key: 'customer_group', title: t('nav', 'customer_group'), url: '/customer-groups' },
            ],
        },
        {
            key: 'bills',
            title: t('nav', 'bills'),
            url: '/bills/receive',
            icon: Banknote,
            permission: 'contact.payment',
            items: [
                { key: 'bill_receive', title: t('nav', 'bill_receive'), url: '/bills/receive' },
                { key: 'bill_pay', title: t('nav', 'bill_pay'), url: '/bills/pay' },
                { key: 'add_discount', title: t('nav', 'add_discount'), url: '/bills/discount' },
            ],
        },
        {
            key: 'expenses',
            title: t('nav', 'expenses'),
            url: '/expenses',
            icon: HandCoins,
            permission: 'expense.view',
            items: [
                { key: 'expenses', title: t('nav', 'expenses'), url: '/expenses' },
                { key: 'expense_categories', title: t('nav', 'expense_categories'), url: '/expense-categories' },
                { key: 'other_income', title: t('nav', 'other_income'), url: '/other-income' },
            ],
        },
        {
            key: 'payment_accounts',
            title: t('nav', 'payment_accounts'),
            url: '/accounts',
            icon: Wallet,
            permission: 'account.view',
            items: [
                { key: 'accounts', title: t('nav', 'accounts'), url: '/accounts' },
                {
                    key: 'financial_position',
                    title: t('nav', 'financial_position'),
                    url: '/reports/financial-position',
                    permission: 'financial_position.view',
                },
            ],
        },
        {
            key: 'accounting',
            title: t('nav', 'accounting'),
            url: '/chart-of-accounts',
            icon: BookText,
            permission: 'accounting.view',
            items: [
                { key: 'chart_of_accounts', title: t('nav', 'chart_of_accounts'), url: '/chart-of-accounts' },
                { key: 'journal_entries', title: t('nav', 'journal_entries'), url: '/journal-entries' },
                { key: 'accounting_periods', title: t('nav', 'accounting_periods'), url: '/accounting-periods' },
            ],
        },
        {
            key: 'assets_liabilities',
            title: t('nav', 'assets_liabilities'),
            url: '/assets',
            icon: Landmark,
            items: [
                { key: 'assets', title: t('nav', 'assets'), url: '/assets', permission: 'asset.view' },
                { key: 'other_liabilities', title: t('nav', 'other_liabilities'), url: '/other-liabilities', permission: 'asset.view' },
                { key: 'investors', title: t('nav', 'investors'), url: '/investors', permission: 'finance.view' },
                { key: 'company_loans', title: t('nav', 'company_loans'), url: '/company-loans', permission: 'finance.view' },
            ],
        },
        {
            key: 'staff',
            title: t('nav', 'staff'),
            url: '/staff',
            icon: IdCard,
            permission: 'staff.view',
        },
        {
            key: 'service_warranty',
            title: t('nav', 'service_warranty'),
            url: '/service-requests',
            icon: ShieldCheck,
            permission: 'service.view',
            items: [
                { key: 'service_requests', title: t('nav', 'service_requests'), url: '/service-requests' },
                { key: 'warranty_claims', title: t('nav', 'warranty_claims'), url: '/warranty-claims' },
            ],
        },
        {
            key: 'reports',
            title: t('nav', 'reports'),
            url: '/reports/profit-loss',
            icon: BarChart3,
            permission: 'report.view',
            items: [
                { key: 'profit_loss', title: t('nav', 'profit_loss'), url: '/reports/profit-loss' },
                { key: 'balance_sheet', title: t('nav', 'balance_sheet'), url: '/reports/balance-sheet' },
                { key: 'cash_flow', title: t('nav', 'cash_flow'), url: '/reports/cash-flow' },
                { key: 'trial_balance', title: t('nav', 'trial_balance'), url: '/reports/trial-balance' },
                { key: 'due_report', title: t('nav', 'due_report'), url: '/reports/due' },
                { key: 'trending_products', title: t('nav', 'trending_products'), url: '/reports/trending-products' },
            ],
        },
        {
            key: 'user_management',
            title: t('nav', 'user_management'),
            url: '/roles',
            icon: KeyRound,
            permission: 'role.manage',
            items: [
                { key: 'users', title: t('nav', 'users'), url: '/roles?tab=users' },
                { key: 'roles', title: t('nav', 'roles'), url: '/roles?tab=roles' },
            ],
        },
        {
            key: 'business_settings',
            title: t('nav', 'business_settings'),
            url: '/business-settings',
            icon: Settings,
            permission: 'settings.manage',
            items: [
                { key: 'business_settings', title: t('nav', 'business_settings'), url: '/business-settings' },
                { key: 'invoice_settings', title: t('nav', 'invoice_settings'), url: '/invoice-settings' },
            ],
        },
        {
            // One parent for the admin utilities. No permission of its own: `filterNavByPermission` shows it
            // only while at least one child is allowed (and hides it otherwise).
            key: 'system_tools',
            title: t('nav', 'system_tools'),
            url: '/imports',
            icon: Wrench,
            items: [
                { key: 'import_tools', title: t('nav', 'import_tools'), url: '/imports', permission: 'import.view' },
                { key: 'backups', title: t('nav', 'backups'), url: '/backups', permission: 'backup.manage' },
                { key: 'system_guide', title: t('nav', 'system_guide'), url: '/system-guide' },
                { key: 'activity_log', title: t('nav', 'activity_log'), url: '/activity-log', permission: 'activity_log.view' },
            ],
        },
    ];
}

/**
 * Hides every menu/submenu the user lacks the `permission` for (corrections.md
 * #9) — and any parent left with no visible child, so an empty collapsible
 * never renders. UI-only: the real enforcement is the `module:` route middleware.
 */
export function filterNavByPermission(items: NavItem[], permissions: string[]): NavItem[] {
    const allowed = (item: NavItem) => !item.permission || permissions.includes(item.permission);

    return items.flatMap((item) => {
        if (!allowed(item)) {
            return [];
        }

        if (!item.items || item.items.length === 0) {
            return [item];
        }

        const visibleChildren = filterNavByPermission(item.items, permissions);

        return visibleChildren.length > 0 ? [{ ...item, items: visibleChildren }] : [];
    });
}
