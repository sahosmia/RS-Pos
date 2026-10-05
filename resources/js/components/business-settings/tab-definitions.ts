import { Activity, ArrowDownUp, CreditCard, LayoutDashboard, Palette, ShoppingBag, SlidersHorizontal, Zap, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

export const SETTINGS_TABS: { value: string; label: string; icon: LucideIcon }[] = [
    { value: 'business', label: 'Business', icon: ShoppingBag },
    { value: 'branding', label: 'Branding', icon: Palette },
    { value: 'menu-order', label: 'Menu Order', icon: ArrowDownUp },
    { value: 'quick-actions', label: 'Quick Actions', icon: Zap },
    { value: 'invoice', label: 'Invoice', icon: CreditCard },
    { value: 'modules', label: 'Modules', icon: SlidersHorizontal },
    { value: 'pagination', label: 'Pagination', icon: LayoutDashboard },
    { value: 'audit', label: 'Audit Log', icon: Activity },
];

const STORAGE_KEY = 'business-settings-tab';

function readSavedTab(): string {
    try {
        const saved = window.sessionStorage.getItem(STORAGE_KEY);
        return saved && SETTINGS_TABS.some((tab) => tab.value === saved) ? saved : 'business';
    } catch {
        return 'business';
    }
}

/** The open tab, remembered for the browser session — so saving (which reloads the page) keeps you where you were. */
export function useSavedTab() {
    const [tab, setTab] = useState(readSavedTab);

    const changeTab = (next: string) => {
        setTab(next);

        try {
            window.sessionStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Storage may be unavailable.
        }
    };

    return [tab, changeTab] as const;
}
