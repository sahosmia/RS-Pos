import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/** Spinner + short text on one line, e.g. next to a field that is checking something. */
export function LoadingInline({ label = 'Loading...', className }: { label?: string; className?: string }) {
    return (
        <span className={cn('text-muted-foreground inline-flex items-center gap-2 text-sm', className)}>
            <Spinner size="sm" label={label} />
            <span aria-hidden="true">{label}</span>
        </span>
    );
}

/**
 * Dims and blocks a region while it reloads (table, card, form) without changing its size.
 * Put it inside a `relative` container; the content underneath stays mounted so layout doesn't shift.
 * Prefer skeletons for the first load and this for refreshes.
 */
export function LoadingOverlay({ loading, label = 'Loading...', className }: { loading: boolean; label?: string; className?: string }) {
    if (!loading) {
        return null;
    }

    return (
        <div
            aria-busy="true"
            className={cn('bg-card/70 absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] backdrop-blur-[1px] motion-reduce:backdrop-blur-none', className)}
        >
            <span className="bg-popover border-brand-control-border flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-[var(--brand-popover-shadow)]">
                <Spinner size="sm" label={label} />
                <span aria-hidden="true">{label}</span>
            </span>
        </div>
    );
}

/** Centered loading block for a page or panel that has nothing to show yet. */
export function PageLoading({ label = 'Loading...', className, children }: { label?: string; className?: string; children?: ReactNode }) {
    return (
        <div aria-busy="true" className={cn('flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center', className)}>
            <Spinner size="lg" tone="primary" label={label} />
            <p className="text-muted-foreground text-sm" aria-hidden="true">
                {label}
            </p>
            {children}
        </div>
    );
}

/** Covers the whole viewport. Only for moments where *nothing* is safe to interact with (e.g. finalising a sale). */
export function FullScreenLoading({ label = 'Please wait...', description }: { label?: string; description?: string }) {
    return (
        <div className="bg-background/80 fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-[2px] motion-reduce:backdrop-blur-none" aria-busy="true">
            <div className="bg-popover border-brand-card-border flex max-w-xs flex-col items-center gap-3 rounded-brand-card border px-8 py-6 text-center shadow-[var(--brand-dialog-shadow)]">
                <Spinner size="lg" tone="primary" label={label} />
                <p className="text-sm font-medium" aria-hidden="true">
                    {label}
                </p>
                {description && <p className="text-muted-foreground text-[0.8125rem] leading-5">{description}</p>}
            </div>
        </div>
    );
}
