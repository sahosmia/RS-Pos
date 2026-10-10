import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/**
 * Skeleton presets sized like the real components they stand in for (button heights, MetricCard height,
 * form-field rhythm, table row padding) so content swaps in without layout shift.
 * Each preset is one polite `role="status"` region with a hidden "Loading" label; the blocks are `aria-hidden`.
 */
function Busy({ label = 'Loading', className, children }: { label?: string; className?: string; children: ReactNode }) {
    return (
        <div role="status" aria-busy="true" className={className}>
            <span className="sr-only">{label}</span>
            <div aria-hidden="true" className="contents">
                {children}
            </div>
        </div>
    );
}

const TEXT_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3'];

export function SkeletonText({ lines = 3, className, label }: { lines?: number; className?: string; label?: string }) {
    return (
        <Busy label={label} className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, index) => (
                <Skeleton key={index} className={cn('h-3.5', index === lines - 1 && lines > 1 ? 'w-1/2' : TEXT_WIDTHS[index % TEXT_WIDTHS.length])} />
            ))}
        </Busy>
    );
}

export function SkeletonTitle({ className }: { className?: string }) {
    return <Skeleton aria-hidden="true" className={cn('h-5 w-1/3', className)} />;
}

export function SkeletonAvatar({ size = 'default', className }: { size?: 'sm' | 'default' | 'lg'; className?: string }) {
    return <Skeleton aria-hidden="true" className={cn('shrink-0 rounded-full', size === 'sm' ? 'size-8' : size === 'lg' ? 'size-12' : 'size-10', className)} />;
}

/** Matches Button heights: sm 32, default 36, lg 44. */
export function SkeletonButton({ size = 'default', className }: { size?: 'sm' | 'default' | 'lg'; className?: string }) {
    return (
        <Skeleton
            aria-hidden="true"
            className={cn('rounded-brand-control', size === 'sm' ? 'h-8 w-20' : size === 'lg' ? 'h-11 w-32' : 'h-9 w-24', className)}
        />
    );
}

/** Rows for a plain list/grid-based table (DataTable renders its own skeleton rows). Padding matches a default-density row. */
export function SkeletonTable({ rows = 6, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
    return (
        <Busy label="Loading table" className={cn('rounded-brand-control border-brand-control-border bg-card overflow-hidden border', className)}>
            <div className="bg-brand-table-header border-brand-table-divider grid gap-4 border-b px-3.5 py-2.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {Array.from({ length: columns }).map((_, column) => (
                    <Skeleton key={column} className="h-3 w-2/3 bg-brand-control-border/60" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, row) => (
                <div
                    key={row}
                    className="border-brand-table-divider grid gap-4 border-b px-3.5 py-3 last:border-b-0"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                    {Array.from({ length: columns }).map((__, column) => (
                        <Skeleton key={column} className={cn('h-3.5', TEXT_WIDTHS[(row + column) % TEXT_WIDTHS.length])} />
                    ))}
                </div>
            ))}
        </Busy>
    );
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <Card className={className}>
            <CardHeader>
                <SkeletonTitle />
                <Skeleton aria-hidden="true" className="h-3.5 w-1/2" />
            </CardHeader>
            <CardContent>
                <SkeletonText lines={lines} label="Loading card" />
            </CardContent>
        </Card>
    );
}

/** Same footprint as `MetricCard` (min-h-28, p-4). */
export function SkeletonStat({ className }: { className?: string }) {
    return (
        <Card className={cn('flex min-h-28 flex-col justify-between p-4', className)}>
            <Busy label="Loading figure" className="flex min-h-20 flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="size-7 rounded-[calc(var(--brand-control-radius)-2px)]" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
            </Busy>
        </Card>
    );
}

/** Label (20px) + input (36px) pairs with the form's 6px/8px rhythm, then optional footer buttons. */
export function SkeletonForm({ fields = 4, withActions = true, className }: { fields?: number; withActions?: boolean; className?: string }) {
    return (
        <Busy label="Loading form" className={cn('space-y-4', className)}>
            {Array.from({ length: fields }).map((_, index) => (
                <div key={index} className="grid gap-1.5">
                    <Skeleton className="mb-0.5 h-4 w-28" />
                    <Skeleton className="rounded-brand-control h-9 w-full" />
                </div>
            ))}
            {withActions && (
                <div className="flex justify-end gap-2 pt-2">
                    <SkeletonButton />
                    <SkeletonButton />
                </div>
            )}
        </Busy>
    );
}

export function SkeletonList({ items = 4, avatar = true, className }: { items?: number; avatar?: boolean; className?: string }) {
    return (
        <Busy label="Loading list" className={cn('divide-brand-card-border divide-y', className)}>
            {Array.from({ length: items }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-3">
                    {avatar && <SkeletonAvatar />}
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </Busy>
    );
}
