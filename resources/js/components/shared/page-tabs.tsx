import { underlineTabClasses, underlineTabListClasses } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

export interface PageTab {
    href: string;
    label: ReactNode;
    icon?: ReactNode;
}

/**
 * Tab-style navigation between sibling *pages* (each tab is a link, e.g. Settings → Profile / Password).
 * Same underline look as `<TabsList variant="underline">`; the current page is marked with `aria-current="page"`
 * (links, not tab roles, because every tab loads a different URL).
 */
export function PageTabs({ tabs, currentPath, label, className }: { tabs: PageTab[]; currentPath: string; label: string; className?: string }) {
    return (
        <nav aria-label={label} className={cn(underlineTabListClasses, 'scrollbar-none overflow-x-auto', className)}>
            {tabs.map((tab) => {
                const active = currentPath === tab.href;

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={active ? 'page' : undefined}
                        data-state={active ? 'active' : 'inactive'}
                        className={underlineTabClasses}
                    >
                        {tab.icon}
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
