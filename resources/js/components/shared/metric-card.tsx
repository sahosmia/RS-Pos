import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

export type MetricAccent = 'success' | 'info' | 'warning' | 'danger' | 'financial' | 'neutral';
export type MetricChangeType = 'positive' | 'negative' | 'neutral';

/** Icon chip colours. Most tiles should stay `neutral`; use an accent only when the colour means something. */
const accentStyles: Record<MetricAccent, string> = {
    success: 'bg-brand-success/18 text-brand-success-text',
    info: 'bg-brand-primary/16 text-brand-primary',
    warning: 'bg-brand-warning/25 text-brand-warning-text',
    danger: 'bg-brand-danger/16 text-brand-danger-text',
    financial: 'bg-brand-primary/16 text-brand-primary',
    neutral: 'bg-brand-secondary text-muted-foreground',
};

/** Soft card fill per accent — a quiet tint of the same colour as the icon chip, in light and dark. */
const tintStyles: Record<MetricAccent, string> = {
    success: 'bg-brand-success/14',
    info: 'bg-brand-primary/12',
    warning: 'bg-brand-warning/18',
    danger: 'bg-brand-danger/12',
    financial: 'bg-brand-primary/12',
    neutral: '',
};

const changeStyles: Record<MetricChangeType, { className: string; Icon: LucideIcon }> = {
    positive: { className: 'text-brand-success-text', Icon: ArrowUpRight },
    negative: { className: 'text-brand-danger-text', Icon: ArrowDownRight },
    neutral: { className: 'text-muted-foreground', Icon: Minus },
};

interface MetricCardProps {
    label: string;
    value: ReactNode;
    /** Optional — detail pages that just show a figure can omit it. */
    icon?: LucideIcon;
    /** Small muted line under the figure, e.g. "Min: 5 pcs" or "vs last month". */
    caption?: ReactNode;
    accent?: MetricAccent;
    /** Trend text, e.g. "12.8%". Colour and arrow come from `changeType`. */
    change?: ReactNode;
    changeType?: MetricChangeType;
    /** Keeps the tile's size and shows placeholders while the figure loads. */
    loading?: boolean;
    className?: string;
}

/**
 * The ERP's single stat/KPI card: label, dominant figure, optional trend and caption.
 * The figure is the visual focus; the icon is deliberately small and quiet.
 */
export function MetricCard({
    label,
    value,
    icon: Icon,
    caption,
    accent = 'neutral',
    change,
    changeType = 'neutral',
    loading = false,
    className,
}: MetricCardProps) {
    const trend = changeStyles[changeType];

    return (
        <Card
            variant="soft"
            className={cn('flex min-h-28 min-w-0 flex-col justify-between gap-2 p-4', tintStyles[accent], className)}
            aria-busy={loading || undefined}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-muted-foreground truncate text-[0.8125rem] leading-5 font-medium">{label}</p>
                {Icon && (
                    <span
                        className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-[calc(var(--brand-control-radius)-2px)]',
                            accentStyles[accent],
                        )}
                        aria-hidden="true"
                    >
                        <Icon className="size-4" />
                    </span>
                )}
            </div>

            {loading ? (
                <div className="space-y-2" aria-hidden="true">
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-3.5 w-1/3" />
                </div>
            ) : (
                <div className="min-w-0">
                    <p
                        className="text-foreground truncate text-xl leading-8 font-semibold tracking-tight tabular-nums sm:text-2xl"
                        title={typeof value === 'string' ? value : undefined}
                    >
                        {value}
                    </p>
                    {(change || caption) && (
                        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs leading-4">
                            {change && (
                                <span className={cn('inline-flex shrink-0 items-center gap-0.5 font-medium tabular-nums', trend.className)}>
                                    <trend.Icon className="size-3.5" aria-hidden="true" />
                                    {change}
                                </span>
                            )}
                            {caption && <span className="text-muted-foreground truncate">{caption}</span>}
                        </p>
                    )}
                </div>
            )}
        </Card>
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
