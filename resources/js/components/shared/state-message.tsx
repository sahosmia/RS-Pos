import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

type StateTone = 'neutral' | 'warning' | 'danger';

const TONES: Record<StateTone, string> = {
    neutral: 'bg-brand-secondary text-muted-foreground',
    warning: 'bg-brand-warning/15 text-brand-warning-text',
    danger: 'bg-brand-danger/10 text-brand-danger-text',
};

export interface StateMessageProps {
    icon?: LucideIcon;
    tone?: StateTone;
    title: ReactNode;
    description?: ReactNode;
    /** Small muted line under the description (technical detail, request id). */
    detail?: ReactNode;
    /** Actions (Buttons) under the text. */
    children?: ReactNode;
    /** Inside a card/widget/table body: tight padding, no frame. Default is a page-level block. */
    compact?: boolean;
    /** `dashed` suits "nothing here yet", `solid` suits errors, `none` removes the frame. Ignored when `compact`. */
    frame?: 'dashed' | 'solid' | 'none';
    role?: 'status' | 'alert';
    className?: string;
}

/**
 * Shared layout for every "this region has no content right now" state — empty, no results, no access,
 * errors: icon chip, title, description, optional actions. Presentational only; callers pass the words
 * and the actions. No illustrations, so it stays quiet inside dense ERP screens.
 */
export function StateMessage({
    icon: Icon,
    tone = 'neutral',
    title,
    description,
    detail,
    children,
    compact = false,
    frame = 'dashed',
    role,
    className,
}: StateMessageProps) {
    return (
        <div
            role={role}
            className={cn(
                'flex flex-col items-center justify-center text-center',
                compact ? 'gap-1.5 px-4 py-6' : 'gap-2 p-10',
                !compact && frame === 'dashed' && 'rounded-brand-card bg-brand-secondary/40',
                !compact && frame === 'solid' && 'rounded-brand-card bg-card shadow-[var(--brand-card-shadow-elevated)]',
                className,
            )}
        >
            {Icon && (
                <div
                    className={cn(
                        'mb-1 flex items-center justify-center',
                        compact ? 'rounded-brand-control size-10' : 'rounded-brand-card size-12',
                        TONES[tone],
                    )}
                >
                    <Icon className={compact ? 'size-5' : 'size-6'} aria-hidden="true" />
                </div>
            )}
            <p className={cn('leading-snug font-semibold', compact ? 'text-sm' : 'text-base')}>{title}</p>
            {description && <p className="text-muted-foreground max-w-sm text-sm leading-5">{description}</p>}
            {detail && <p className="text-muted-foreground/80 max-w-sm font-mono text-xs leading-4 break-words">{detail}</p>}
            {children && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{children}</div>}
        </div>
    );
}
