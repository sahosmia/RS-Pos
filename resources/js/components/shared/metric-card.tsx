import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

export type MetricAccent = 'success' | 'info' | 'warning' | 'danger' | 'financial' | 'neutral';

const accentStyles: Record<MetricAccent, { icon: string; iconBackground: string; indicator: string }> = {
    success: {
        icon: 'text-emerald-600 dark:text-emerald-400',
        iconBackground: 'bg-emerald-500/10 dark:bg-emerald-400/10',
        indicator: 'bg-emerald-500 dark:bg-emerald-400',
    },
    info: {
        icon: 'text-blue-600 dark:text-blue-400',
        iconBackground: 'bg-blue-500/10 dark:bg-blue-400/10',
        indicator: 'bg-blue-500 dark:bg-blue-400',
    },
    warning: {
        icon: 'text-amber-600 dark:text-amber-400',
        iconBackground: 'bg-amber-500/10 dark:bg-amber-400/10',
        indicator: 'bg-amber-500 dark:bg-amber-400',
    },
    danger: {
        icon: 'text-rose-600 dark:text-rose-400',
        iconBackground: 'bg-rose-500/10 dark:bg-rose-400/10',
        indicator: 'bg-rose-500 dark:bg-rose-400',
    },
    financial: {
        icon: 'text-violet-600 dark:text-violet-400',
        iconBackground: 'bg-violet-500/10 dark:bg-violet-400/10',
        indicator: 'bg-violet-500 dark:bg-violet-400',
    },
    neutral: {
        icon: 'text-muted-foreground',
        iconBackground: 'bg-muted',
        indicator: 'bg-muted-foreground',
    },
};

interface MetricCardProps {
    label: string;
    value: ReactNode;
    /** Optional — detail pages that just show a figure can omit it. */
    icon?: LucideIcon;
    accent?: MetricAccent;
    className?: string;
}

/** A single KPI tile: label + big figure, with an accent bar and optional icon. */
export function MetricCard({ label, value, icon: Icon, accent = 'neutral', className }: MetricCardProps) {
    const styles = accentStyles[accent];

    return (
        <div
            className={cn(
                'group border-border/70 bg-card dark:border-border/60 relative flex min-h-28 min-w-0 items-center justify-between gap-4 overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md',
                className,
            )}
        >
            <div className={cn('absolute inset-y-0 left-0 w-0.5 opacity-70', styles.indicator)} />

            <div className="min-w-0 flex-1 pl-1">
                <p className="text-muted-foreground truncate text-xs font-medium tracking-wide">{label}</p>
                <p
                    className="text-foreground mt-1.5 truncate text-xl font-bold tracking-tight tabular-nums sm:text-2xl"
                    title={typeof value === 'string' ? value : undefined}
                >
                    {value}
                </p>
            </div>

            {Icon && (
                <div
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
                        styles.iconBackground,
                        styles.icon,
                    )}
                >
                    <Icon className="size-5" strokeWidth={2} />
                </div>
            )}
        </div>
    );
}

const columnClasses = {
    1: '',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const;

interface MetricGridProps {
    /** Columns at the widest breakpoint — collapses responsively below it. */
    columns?: keyof typeof columnClasses;
    className?: string;
    children: ReactNode;
}

/** Responsive grid for `MetricCard`s. `items-stretch` keeps every tile in a row the same height. */
export function MetricGrid({ columns = 4, className, children }: MetricGridProps) {
    return <div className={cn('grid items-stretch gap-3', columnClasses[columns], className)}>{children}</div>;
}
