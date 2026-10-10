import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface ChartShellProps {
    title: string;
    icon: LucideIcon;
    /** Tailwind classes for the icon chip. */
    iconClassName?: string;
    /** One quiet line under the title, e.g. the unit. */
    subtitle?: string;
    className?: string;
    children: ReactNode;
}

/** Title row + body for a dashboard chart. The surrounding card is the page's `PanelCard` — no second box here. */
export default function ChartShell({ title, icon: Icon, iconClassName, subtitle, className, children }: ChartShellProps) {
    return (
        <div className={cn('flex h-full flex-col p-5', className)}>
            <div className="mb-3 flex items-center gap-3">
                <div
                    className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        iconClassName ?? 'bg-brand-primary/10 text-brand-primary-text',
                    )}
                >
                    <Icon className="size-[18px]" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm leading-5 font-semibold tracking-tight">{title}</h3>
                    {subtitle && <p className="text-muted-foreground text-xs leading-4">{subtitle}</p>}
                </div>
            </div>
            <div className="min-h-0 w-full flex-1">{children}</div>
        </div>
    );
}
