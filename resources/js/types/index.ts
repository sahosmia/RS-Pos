import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
    permissions: string[];
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    /** Stable id used by the admin-configurable menu order (corrections.md #8) — unique among siblings. */
    key: string;
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Sub-items — when present, this item renders as a collapsible group instead of a link. */
    items?: NavItem[];
    /** Hidden unless `auth.permissions` includes this — omit to always show. */
    permission?: string;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    /** True for exactly the one page render right after logging in (flashed, not persisted) — see `useSidebarState`. */
    freshLogin: boolean;
    /** Figures of the sale that was just saved, present only on the page right after saving. */
    savedSale: { invoice_no: string; total_amount: number; due_amount: number; customer_balance: number } | null;
    shop: {
        /** Editable at `business-settings`; falls back to `null` before it's ever been set — see `app.tsx`'s page-title fallback. */
        shop_name: string | null;
        /** Public URL of the uploaded sidebar logo (Business Settings → Branding); null falls back to the shop name. */
        shop_logo_url: string | null;
        /** Compact logo shown while the sidebar is collapsed to icons. */
        shop_logo_small_url: string | null;
        /** Browser tab icon — also rendered into the page head by the Blade layout. */
        favicon_url: string | null;
        currency_symbol: string;
        emi_module_enabled: boolean;
        serial_number_module_enabled: boolean;
        /** An SMS company is set up and switched on (Business Settings → SMS). */
        sms_ready: boolean;
        pagination_options: number[];
        pagination_default: number;
        pagination_allow_all: boolean;
        /** Shop-wide default accent palette — see ThemeColorValue. */
        theme_color: string;
        /** Admin-configured sidebar order (corrections.md #8) — null/missing keys fall back to the built-in order. */
        menu_order: { top: string[]; sub: Record<string, string[]> } | null;
        /** Ctrl+Space switcher: which actions are on and their order — null until an admin saves a list. */
        quick_actions: { key: string; enabled: boolean }[] | null;
    };
    /** Max rows per in-memory export format (config/exports.php); CSV streams and has no limit. */
    exportLimits: { xlsx: number; pdf: number };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    username?: string | null;
    avatar?: string;
    /** UI language preference (Phase 33 §4) — 'en' or 'bn', default 'en'. */
    locale: string;
    /** Personal accent-color override — null means "use the shop's global theme_color". */
    theme_color: string | null;
    /** Dark/light preference (Phase 33-equivalent, corrections.md #7) — 'light' | 'dark' | 'system', default 'system'. */
    appearance: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}
