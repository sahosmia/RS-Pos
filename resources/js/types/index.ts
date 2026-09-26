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
    shop: {
        currency_symbol: string;
        emi_module_enabled: boolean;
        serial_number_module_enabled: boolean;
        pagination_options: number[];
        pagination_default: number;
        pagination_allow_all: boolean;
        /** Shop-wide default accent palette — see ThemeColorValue. */
        theme_color: string;
        /** Admin-configured sidebar order (corrections.md #8) — null/missing keys fall back to the built-in order. */
        menu_order: { top: string[]; sub: Record<string, string[]> } | null;
    };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    /** UI language preference (Phase 33 §4) — 'en' or 'bn', default 'bn'. */
    locale: string;
    /** Personal accent-color override — null means "use the shop's global theme_color". */
    theme_color: string | null;
    /** Dark/light preference (Phase 33-equivalent, corrections.md #7) — 'light' | 'dark' | 'system', default 'system'. */
    appearance: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
