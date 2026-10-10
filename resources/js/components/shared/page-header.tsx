import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface PageHeaderProps {
    /** Optional icon box in front of the title; pages without one show just the title. */
    icon?: LucideIcon;
    /** Full literal color classes for the icon box, e.g. "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400". */
    iconClassName?: string;
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}

/**
 * The top of a list / index page: title (h1) with a one-line description, and the page's main action(s) on the
 * right. Every such page uses it so titles, spacing and the Add button line up the same way.
 */
export default function PageHeader({ icon: Icon, iconClassName = '', title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 sm:items-center">
            <div className="flex items-start gap-3">
                {Icon && (
                    <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
                        <Icon className="size-5" />
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                    {description && <p className="text-muted-foreground text-sm">{description}</p>}
                </div>
            </div>

            {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
        </div>
    );
}
