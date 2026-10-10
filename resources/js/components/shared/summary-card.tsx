import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export interface SummaryRow {
    label: ReactNode;
    /** Already-formatted amount (use `useMoneyFormat()`); the card never formats or calculates. */
    value: ReactNode;
    /** `negative` tints deductions (discount, refund) so they read at a glance. */
    tone?: 'default' | 'negative' | 'muted';
}

interface SummaryCardProps {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    rows: SummaryRow[];
    /** The bottom line, set apart by a rule and heavier type. */
    total?: { label: ReactNode; value: ReactNode };
    loading?: boolean;
    className?: string;
}

const toneClasses: Record<NonNullable<SummaryRow['tone']>, string> = {
    default: '',
    negative: 'text-brand-danger-text',
    muted: 'text-muted-foreground',
};

/** Label → amount rows with an optional total, e.g. invoice, purchase or payment summaries. Values are right-aligned and tabular. */
export function SummaryCard({ title, description, action, rows, total, loading = false, className }: SummaryCardProps) {
    return (
        <Card className={className} aria-busy={loading || undefined}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
                {action && <CardAction>{action}</CardAction>}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-3" aria-hidden="true">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="mt-4 h-6 w-full" />
                    </div>
                ) : (
                    <dl className="space-y-2 text-sm">
                        {rows.map((row, index) => (
                            <div key={index} className="flex items-baseline justify-between gap-4">
                                <dt className="text-muted-foreground">{row.label}</dt>
                                <dd className={cn('text-right font-medium tabular-nums', toneClasses[row.tone ?? 'default'])}>{row.value}</dd>
                            </div>
                        ))}
                        {total && (
                            <div className="border-brand-card-border flex items-baseline justify-between gap-4 border-t pt-3">
                                <dt className="font-semibold">{total.label}</dt>
                                <dd className="text-right text-lg font-semibold tabular-nums">{total.value}</dd>
                            </div>
                        )}
                    </dl>
                )}
            </CardContent>
        </Card>
    );
}
