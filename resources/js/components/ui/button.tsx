import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Brand button. Radix Slot supplies `asChild` composition; all visuals come from the
 * `--brand-*` tokens in app.css so the look can be tuned centrally (and per accent palette).
 *
 * Hierarchy: primary > secondary > outline > ghost. `default` is an alias of `primary`.
 * Icon-only buttons (`size="icon*"`) must receive an `aria-label`.
 */
const buttonVariants = cva(
    [
        'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none',
        'rounded-brand-control text-sm leading-5 font-medium tracking-[0.005em]',
        'motion-control',
        'ring-offset-background outline-hidden focus-visible:ring-2 focus-visible:ring-brand-focus-ring focus-visible:ring-offset-2',
        'active:scale-[0.98] motion-reduce:active:scale-100',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
    ],
    {
        variants: {
            variant: {
                primary:
                    'bg-brand-primary text-brand-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.14),inset_0_1px_0_rgb(255_255_255/0.14)] hover:bg-brand-primary-hover active:bg-brand-primary-active',
                default:
                    'bg-brand-primary text-brand-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.14),inset_0_1px_0_rgb(255_255_255/0.14)] hover:bg-brand-primary-hover active:bg-brand-primary-active',
                secondary: 'bg-brand-secondary text-foreground hover:bg-brand-secondary-hover active:bg-brand-secondary-active',
                /** Borderless: the same soft fill as `secondary`, so every "quiet" button in the app reads as one family. */
                outline: 'bg-brand-secondary text-foreground hover:bg-brand-secondary-hover active:bg-brand-secondary-active',
                /** Light tinted fill, no border — calm toolbar actions in the brand colour. */
                soft: 'bg-brand-primary/10 text-brand-primary-text hover:bg-brand-primary/18 active:bg-brand-primary/25',
                /** The same for a destructive action (Delete selected). */
                'soft-danger': 'bg-brand-danger/10 text-brand-danger-text hover:bg-brand-danger/18 active:bg-brand-danger/25 focus-visible:ring-brand-danger',
                ghost: 'text-foreground/80 hover:bg-brand-secondary hover:text-foreground active:bg-brand-secondary-hover',
                destructive:
                    'bg-brand-danger text-white shadow-[0_1px_2px_rgb(0_0_0/0.14),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-brand-danger-hover active:bg-brand-danger-hover focus-visible:ring-brand-danger',
                success:
                    'bg-brand-success text-white shadow-[0_1px_2px_rgb(0_0_0/0.14),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-brand-success-hover active:bg-brand-success-hover focus-visible:ring-brand-success',
                warning:
                    'bg-brand-warning text-brand-warning-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-brand-warning-hover active:bg-brand-warning-hover focus-visible:ring-brand-warning',
                link: 'h-auto rounded-sm px-0 text-brand-primary underline-offset-4 hover:underline active:scale-100',
            },
            size: {
                xs: 'h-7 px-2.5 text-xs [&_svg:not([class*="size-"])]:size-3.5',
                sm: 'h-8 px-3',
                default: 'h-9 px-4',
                lg: 'h-11 px-6 text-[0.9375rem]',
                icon: 'size-9',
                'icon-sm': 'size-8',
                'icon-lg': 'size-11 [&_svg:not([class*="size-"])]:size-5',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    /** Shows a spinner, blocks interaction and keeps the button's dimensions. Ignored with `asChild`. */
    loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
        const classes = cn(buttonVariants({ variant, size, className }));

        if (asChild) {
            return (
                <Slot className={classes} ref={ref} {...props}>
                    {children}
                </Slot>
            );
        }

        return (
            <button
                ref={ref}
                className={classes}
                disabled={disabled || loading}
                aria-busy={loading || undefined}
                {...props}
            >
                {loading ? (
                    <>
                        <span className="invisible inline-flex items-center justify-center gap-2" aria-hidden="true">
                            {children}
                        </span>
                        <Loader2 className="absolute animate-spin motion-reduce:animate-none" role="status" aria-label="Loading" />
                    </>
                ) : (
                    children
                )}
            </button>
        );
    },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
