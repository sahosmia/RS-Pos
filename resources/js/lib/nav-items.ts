import { type useTranslation } from '@/hooks/use-translation';
import { type NavItem } from '@/types';
import {
    BarChart3,
    BookText,
    DatabaseBackup,
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
    Upload,
    Users,
    Wallet,
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
                { key: 'sale_returns', title: t('nav', 'sale_returns'), url: '/sale-returns' },
                { key: 'sales_order', title: t('nav', 'sales_order'), url: '/sales-orders' },
                ...(emiModuleEnabled ? [{ key: 'emi_installments', title: t('nav', 'emi_installments'), url: '/emi-installments' }] : []),
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
                { key: 'low_stock', title: t('nav', 'low_stock'), url: '/products?stock_status=low_stock' },
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
            key: 'expenses',
            title: t('nav', 'expenses'),
            url: '/expenses',
            icon: HandCoins,
            permission: 'expense.view',
        },
        {
            key: 'payment_accounts',
            title: t('nav', 'payment_accounts'),
            url: '/accounts',
            icon: Wallet,
            permission: 'account.view',
            items: [
                { key: 'accounts', title: t('nav', 'accounts'), url: '/accounts' },
                { key: 'petty_cash', title: t('nav', 'petty_cash'), url: '/cash-book' },
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
            permission: 'asset.view',
            items: [
                { key: 'assets', title: t('nav', 'assets'), url: '/assets' },
                { key: 'other_liabilities', title: t('nav', 'other_liabilities'), url: '/other-liabilities' },
            ],
        },
        {
            key: 'investor_menu',
            title: t('nav', 'investors'),
            url: '/investors',
            icon: Wallet,
            permission: 'finance.view',
            items: [
                { key: 'investors', title: t('nav', 'investors'), url: '/investors' },
                { key: 'company_loans', title: t('nav', 'company_loans'), url: '/company-loans' },
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
                {
                    key: 'financial_position',
                    title: t('nav', 'financial_position'),
                    url: '/reports/financial-position',
                    permission: 'financial_position.view',
                },
                { key: 'trial_balance', title: t('nav', 'trial_balance'), url: '/reports/trial-balance' },
                { key: 'cash_flow', title: t('nav', 'cash_flow'), url: '/reports/cash-flow' },
                { key: 'stock_report', title: t('nav', 'stock_report'), url: '/reports/stock' },
                { key: 'due_report', title: t('nav', 'due_report'), url: '/reports/due' },
                { key: 'trending_products', title: t('nav', 'trending_products'), url: '/reports/trending-products' },
            ],
        },
        {
            key: 'import_tools',
            title: t('nav', 'import_tools'),
            url: '/imports',
            icon: Upload,
            permission: 'import.view',
        },
        {
            key: 'backups',
            title: t('nav', 'backups'),
            url: '/backups',
            icon: DatabaseBackup,
            permission: 'backup.manage',
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
