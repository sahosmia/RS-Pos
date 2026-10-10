import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export interface InfoItem {
    label: ReactNode;
    /** Empty values render as an em dash so the row never collapses. */
    value?: ReactNode;
    /** Omit the row entirely (e.g. no email on file). */
    hidden?: boolean;
}

interface InfoCardProps {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    items: InfoItem[];
    loading?: boolean;
    className?: string;
}

/** Label/value details (customer, supplier, product info) as a plain definition list — no nested boxes. */
export function InfoCard({ title, description, action, items, loading = false, className }: InfoCardProps) {
    const visible = items.filter((item) => !item.hidden);

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
                        {Array.from({ length: Math.max(visible.length, 3) }).map((_, index) => (
                            <Skeleton key={index} className="h-4 w-full" />
                        ))}
                    </div>
                ) : (
                    <dl className="space-y-2.5 text-sm">
                        {visible.map((item, index) => {
                            const empty = item.value === undefined || item.value === null || item.value === '';

                            return (
                                <div key={index} className="grid gap-0.5 sm:grid-cols-[8rem_1fr] sm:gap-4">
                                    <dt className="text-muted-foreground">{item.label}</dt>
                                    <dd className={cn('min-w-0 font-medium wrap-break-word', empty && 'text-muted-foreground font-normal')}>{empty ? '—' : item.value}</dd>
                                </div>
                            );
                        })}
                    </dl>
                )}
            </CardContent>
        </Card>
    );
}
