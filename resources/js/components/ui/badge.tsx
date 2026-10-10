import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Generic, business-agnostic badge. Semantic variants are soft tints (tinted fill, no border +
 * readable text) built from the `--brand-*` tokens, so colour never shouts and holds up in dark mode.
 * Which variant a business status gets lives in `lib/status.ts`, not here.
 *
 * `default` is the one solid (filled) variant; everything else is soft.
 */
const badgeVariants = cva(
    [
        'inline-flex max-w-full shrink-0 items-center gap-1 rounded-[calc(var(--brand-control-radius)-3px)] border align-middle font-medium whitespace-nowrap',
        'motion-colors',
        'outline-hidden focus-visible:ring-2 focus-visible:ring-brand-focus-ring focus-visible:ring-offset-1 ring-offset-background',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    ],
    {
        variants: {
            variant: {
                default: 'border-transparent bg-brand-primary text-brand-primary-foreground',
                primary: 'border-transparent bg-brand-primary/12 text-brand-primary-text',
                secondary: 'border-transparent bg-brand-secondary text-foreground',
                neutral: 'border-transparent bg-brand-secondary/70 text-muted-foreground',
                success: 'border-transparent bg-brand-success/12 text-brand-success-text',
                warning: 'border-transparent bg-brand-warning/18 text-brand-warning-text',
                destructive: 'border-transparent bg-brand-danger/12 text-brand-danger-text',
                info: 'border-transparent bg-brand-info/12 text-brand-info-text',
                outline: 'border-brand-control-border bg-transparent text-foreground',
            },
            size: {
                xs: 'h-4 px-1 text-[0.625rem] leading-none [&_svg]:size-2.5',
                sm: 'h-5 px-1.5 text-[0.6875rem] leading-none [&_svg]:size-3',
                default: 'h-6 px-2 text-xs leading-none [&_svg]:size-3.5',
                lg: 'h-7 px-2.5 text-[0.8125rem] leading-none [&_svg]:size-4',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

interface BadgeProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>, VariantProps<typeof badgeVariants> {
    /** Small coloured dot before the label (takes the variant's text colour). */
    dot?: boolean;
    /** Icon before the label. Decorative — the label must carry the meaning. */
    icon?: React.ReactNode;
    /** Icon after the label. */
    trailingIcon?: React.ReactNode;
    /** Shows an × button; the tag is removed by the handler. */
    onRemove?: () => void;
    /** Accessible name for the × button, e.g. `Remove Mobile`. */
    removeLabel?: string;
    /** Numeric counter styling: tabular figures, keeps a minimum width so "3" and "30" look alike. */
    count?: boolean;
    /** Render as the child (e.g. an Inertia `<Link>`) — icons/dot/remove are then up to the child. */
    asChild?: boolean;
}

/**
 * Renders a `span`; becomes a real `button` when `onClick` is given (focusable, Enter/Space) or
 * the child element when `asChild` is used.
 */
const Badge = React.forwardRef<HTMLElement, BadgeProps>(
    ({ className, variant, size, dot, icon, trailingIcon, onRemove, removeLabel = 'Remove', count, asChild, onClick, children, ...props }, ref) => {
        const classes = cn(
            badgeVariants({ variant, size }),
            count && 'min-w-5 justify-center px-1 tabular-nums',
            onClick && 'cursor-pointer hover:opacity-80 active:opacity-70',
            className,
        );

        if (asChild) {
            return (
                <Slot ref={ref as React.Ref<HTMLElement>} className={classes} onClick={onClick} {...props}>
                    {children}
                </Slot>
            );
        }

        const Comp = onClick ? 'button' : 'span';

        return (
            <Comp
                ref={ref as React.Ref<never>}
                className={classes}
                onClick={onClick}
                {...(onClick && { type: 'button' as const })}
                {...props}
            >
                {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
                {icon}
                {children}
                {trailingIcon}
                {onRemove && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemove();
                        }}
                        aria-label={removeLabel}
                        className="-mr-0.5 inline-flex rounded-sm opacity-70 outline-hidden hover:opacity-100 focus-visible:ring-2 focus-visible:ring-brand-focus-ring"
                    >
                        <X />
                    </button>
                )}
            </Comp>
        );
    },
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
export type { BadgeProps, BadgeVariant };
