import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlert, CircleCheck, CircleX, Info, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Inline message inside a page, card or form. Soft tint + hairline border + a coloured icon, with the
 * title/description always in normal text colours so contrast never depends on the tint.
 *
 * Semantics: `destructive` is announced assertively (`role="alert"`); every other variant is a polite
 * `role="status"`. Don't put a live Alert on screen at load time unless it should be read out.
 */
const alertVariants = cva(
    'relative flex w-full items-start gap-3 rounded-brand-control border px-3.5 py-3 text-sm [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                neutral: 'border-brand-card-border bg-brand-secondary/50 [&>[data-slot=alert-icon]]:text-muted-foreground',
                info: 'border-brand-info/25 bg-brand-info/8 [&>[data-slot=alert-icon]]:text-brand-info-text',
                success: 'border-brand-success/25 bg-brand-success/8 [&>[data-slot=alert-icon]]:text-brand-success-text',
                warning: 'border-brand-warning/40 bg-brand-warning/10 [&>[data-slot=alert-icon]]:text-brand-warning-text',
                destructive: 'border-brand-danger/25 bg-brand-danger/8 [&>[data-slot=alert-icon]]:text-brand-danger-text',
            },
        },
        defaultVariants: { variant: 'neutral' },
    },
);

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

const DEFAULT_ICONS: Record<AlertVariant, React.ReactNode> = {
    neutral: <Info />,
    info: <Info />,
    success: <CircleCheck />,
    warning: <CircleAlert />,
    destructive: <CircleX />,
};

interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof alertVariants> {
    /** Override the variant's icon, or `false` for none. */
    icon?: React.ReactNode | false;
    /** Shorthand for `<AlertTitle>`; omit to compose `AlertTitle`/`AlertDescription` yourself. */
    title?: React.ReactNode;
    /** A button/link on the right (e.g. "Restock"). Use the regular `Button`. */
    action?: React.ReactNode;
    /** Shows a close button; the caller hides the alert. */
    onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant = 'neutral', icon, title, action, onDismiss, role, children, ...props }, ref) => {
        const resolvedVariant = variant ?? 'neutral';
        const resolvedIcon = icon === undefined ? DEFAULT_ICONS[resolvedVariant] : icon;

        return (
            <div
                ref={ref}
                role={role ?? (resolvedVariant === 'destructive' ? 'alert' : 'status')}
                className={cn(alertVariants({ variant }), className)}
                {...props}
            >
                {resolvedIcon && (
                    <span data-slot="alert-icon" className="mt-0.5 flex size-4 items-center justify-center [&_svg]:size-4" aria-hidden="true">
                        {resolvedIcon}
                    </span>
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                    {title && <AlertTitle>{title}</AlertTitle>}
                    {children}
                </div>
                {action && <div className="shrink-0 self-center">{action}</div>}
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss"
                        className="text-muted-foreground hover:bg-brand-secondary hover:text-foreground focus-visible:ring-brand-focus-ring -my-1 -mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-[calc(var(--brand-control-radius)-2px)] motion-colors outline-hidden focus-visible:ring-2"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>
        );
    },
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-foreground leading-5 font-semibold', className)} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-muted-foreground text-[0.8125rem] leading-5 [&_p]:leading-5', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription, AlertTitle, alertVariants };
export type { AlertVariant };
