import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface PageHeaderProps {
    icon: LucideIcon;
    /** Full literal color classes for the icon box, e.g. "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400". */
    iconClassName: string;
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}

export default function PageHeader({ icon: Icon, iconClassName, title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
                    <Icon className="size-5" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                    {description && <p className="text-muted-foreground text-sm">{description}</p>}
                </div>
            </div>

            {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
        </div>
    );
}
