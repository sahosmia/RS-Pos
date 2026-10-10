import {
    type LucideIcon,
    Boxes,
    ClipboardList,
    HandCoins,
    Package,
    Receipt,
    RotateCcw,
    ShoppingBag,
    Undo2,
    UserPlus,
    Wallet,
    Wrench,
} from 'lucide-react';

export interface QuickActionDefinition {
    key: string;
    label: string;
    icon: LucideIcon;
    /** The `module.action` permission needed — an action the user can't perform is never offered. */
    permission: string;
    /** Resolved lazily: Ziggy's `route()` is only available once the app has booted. */
    href: () => string;
}

/** What an admin saves in Business Settings: which actions are on, in the order they cycle through. */
export interface QuickActionSetting {
    key: string;
    enabled: boolean;
}

/**
 * Every action the Ctrl+Space switcher can offer, in its default order. Keep the keys in sync with
 * `Settings::QUICK_ACTION_KEYS` on the backend. Pages without a standalone create route open their Add
 * modal on arrival through `?quick_create=1` (the same trick the header's Quick Create menu uses).
 */
export const QUICK_ACTIONS: QuickActionDefinition[] = [
    { key: 'add_sale', label: 'Add Sale', icon: Receipt, permission: 'sale.create', href: () => route('sales.create') },
    { key: 'add_purchase', label: 'Add Purchase', icon: ShoppingBag, permission: 'purchase.create', href: () => route('purchases.create') },
    {
        key: 'add_contact',
        label: 'Add Contact',
        icon: UserPlus,
        permission: 'contact.create',
        href: () => route('contacts.index', { quick_create: '1' }),
    },
    { key: 'add_product', label: 'Add Product', icon: Package, permission: 'product.create', href: () => route('products.create') },
    {
        key: 'add_expense',
        label: 'Add Expense',
        icon: Wallet,
        permission: 'expense.create',
        href: () => route('expenses.index', { quick_create: '1' }),
    },
    {
        key: 'add_other_income',
        label: 'Add Other Income',
        icon: HandCoins,
        permission: 'expense.create',
        href: () => route('other-income.index', { quick_create: '1' }),
    },
    { key: 'add_sales_order', label: 'Add Sales Order', icon: ClipboardList, permission: 'sale.create', href: () => route('sales-orders.create') },
    {
        key: 'add_asset',
        label: 'Add Asset',
        icon: Boxes,
        permission: 'asset.create',
        href: () => route('assets.index', { quick_create: '1' }),
    },
    { key: 'add_service', label: 'Add Service', icon: Wrench, permission: 'service.create', href: () => route('service-requests.create') },
    { key: 'add_sale_return', label: 'Add Sale Return', icon: RotateCcw, permission: 'sale.create', href: () => route('sale-returns.create') },
    {
        key: 'add_purchase_return',
        label: 'Add Purchase Return',
        icon: Undo2,
        permission: 'purchase.create',
        href: () => route('purchase-returns.create'),
    },
];

/** On until an admin says otherwise — the extra actions stay off by default so the switcher starts short. */
const DEFAULT_ENABLED = new Set(['add_sale', 'add_purchase', 'add_contact', 'add_product', 'add_expense']);

export const QUICK_ACTIONS_BY_KEY = new Map(QUICK_ACTIONS.map((action) => [action.key, action]));

/**
 * Reconciles a possibly-null/partial saved list against the actions the app really has: keeps the saved
 * order and on/off state, drops unknown keys, and appends anything new at the end with its default state.
 */
export function buildEffectiveQuickActions(saved: QuickActionSetting[] | null | undefined): QuickActionSetting[] {
    const kept = (saved ?? []).filter((item) => QUICK_ACTIONS_BY_KEY.has(item.key));
    const missing = QUICK_ACTIONS.filter((action) => !kept.some((item) => item.key === action.key)).map((action) => ({
        key: action.key,
        enabled: DEFAULT_ENABLED.has(action.key),
    }));

    return [...kept, ...missing];
}

/** The actions the switcher should actually show this user: switched on by the admin AND permitted. */
export function resolveQuickActions(saved: QuickActionSetting[] | null | undefined, permissions: string[]): QuickActionDefinition[] {
    return buildEffectiveQuickActions(saved)
        .filter((item) => item.enabled)
        .map((item) => QUICK_ACTIONS_BY_KEY.get(item.key))
        .filter((action): action is QuickActionDefinition => action !== undefined && permissions.includes(action.permission));
}
