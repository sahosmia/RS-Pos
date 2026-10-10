import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Brand card surface. By default a card has no border: a soft shadow lifts it off the page (all `--brand-card-*`
 * tokens). Use `variant="bordered"` where a visible edge helps (dense forms), `tinted` for a light brand fill. Don't nest a Card inside a Card —
 * separate sections with a divider (`CardHeader divided`), spacing or a section heading instead.
 */
const cardVariants = cva('rounded-brand-card border border-brand-card-border bg-card text-card-foreground', {
    variants: {
        variant: {
            default: 'border-transparent shadow-[var(--brand-card-shadow-elevated)]',
            /** The previous look: hairline border + barely-there shadow. */
            bordered: 'shadow-[var(--brand-card-shadow)]',
            flat: 'shadow-none',
            elevated: 'shadow-[var(--brand-card-shadow-elevated)]',
            /** No border: the soft shadow alone lifts it off the page. Modern and calm — good for stat tiles. */
            soft: 'border-transparent shadow-[var(--brand-card-shadow-elevated)]',
            /** No border, and a light brand-colour fill instead of white. */
            tinted: 'border-transparent bg-brand-primary/8 shadow-none',
        },
        interactive: {
            true: [
                'cursor-pointer outline-hidden motion-surface',
                // Lift is a single pixel; pressing drops it back. Static cards (the default) have no hover motion at all.
                'hover:-translate-y-px hover:border-brand-control-border-hover hover:shadow-[var(--brand-card-shadow-elevated)] active:translate-y-0 active:shadow-[var(--brand-card-shadow)]',
                'focus-visible:ring-[3px] focus-visible:ring-brand-focus-ring/30 focus-visible:border-brand-focus-ring',
            ],
            false: '',
        },
    },
    defaultVariants: { variant: 'default', interactive: false },
});

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, Omit<VariantProps<typeof cardVariants>, 'interactive'> {
    /** Subtle hover/focus feedback. Prefer `asChild` with a `<Link>`/`<button>` so the card has real semantics. */
    interactive?: boolean;
    /** Render as the child element (e.g. an Inertia `<Link>`) instead of a `div`. */
    asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, interactive = false, asChild = false, onClick, onKeyDown, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    // A bare clickable div needs button semantics; with `asChild` the child element already has them.
    const needsButtonSemantics = interactive && !asChild && onClick !== undefined;

    return (
        <Comp
            ref={ref}
            data-slot="card"
            className={cn(cardVariants({ variant, interactive }), className)}
            onClick={onClick}
            {...(needsButtonSemantics && {
                role: 'button',
                tabIndex: 0,
                onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                    onKeyDown?.(event);

                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        event.currentTarget.click();
                    }
                },
            })}
            {...(!needsButtonSemantics && { onKeyDown })}
            {...props}
        />
    );
});
Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Draws a divider under the header — use when the body is a distinct block (table, form fields). */
    divided?: boolean;
}

/** Title + description on the left, an optional `CardAction` on the right. */
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(({ className, divided = false, ...props }, ref) => (
    <div
        ref={ref}
        data-slot="card-header"
        data-divided={divided ? '' : undefined}
        className={cn(
            'grid auto-rows-min items-start gap-x-3 gap-y-1 px-(--brand-card-padding) pt-(--brand-card-padding) pb-3 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
            divided && 'border-b border-brand-card-border py-3.5',
            className,
        )}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-base leading-snug font-semibold tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-muted-foreground text-sm leading-5', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

/** Right-aligned header slot for a Button / dropdown trigger / Badge. */
const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        data-slot="card-action"
        className={cn('col-start-2 row-span-2 row-start-1 flex items-center gap-1.5 self-start justify-self-end', className)}
        {...props}
    />
));
CardAction.displayName = 'CardAction';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        data-slot="card-content"
        className={cn('p-(--brand-card-padding) [[data-slot=card-header]:not([data-divided])+&]:pt-0', className)}
        {...props}
    />
));
CardContent.displayName = 'CardContent';

/** Visually secondary strip: "Last updated 2 min ago" on the left, a link/button on the right. */
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        data-slot="card-footer"
        className={cn(
            'text-muted-foreground flex items-center justify-between gap-2 rounded-b-[inherit] border-t border-brand-card-border bg-brand-card-footer px-(--brand-card-padding) py-3 text-sm',
            className,
        )}
        {...props}
    />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
