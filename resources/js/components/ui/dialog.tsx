import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            'fixed inset-0 z-50 bg-brand-overlay data-[state=closed]:duration-fast data-[state=open]:duration-normal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none',
            className,
        )}
        {...props}
    />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Whether the dialog uses the structured layout (header / scrolling body / footer, no outer padding)
 * or the legacy padded layout (everything padded and scrolling together). Header and footer adapt.
 */
const DialogLayoutContext = React.createContext<{ structured: boolean }>({ structured: false });

const dialogVariants = cva(
    [
        'fixed top-[50%] left-[50%] z-50 w-[calc(100%-1.5rem)] translate-x-[-50%] translate-y-[-50%] overflow-hidden',
        'rounded-brand-card bg-card text-card-foreground shadow-[var(--brand-dialog-shadow)]',
        'ease-standard data-[state=closed]:duration-fast data-[state=open]:duration-normal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]',
        'motion-reduce:animate-none',
    ],
    {
        variants: {
            size: {
                sm: 'sm:max-w-sm',
                default: 'sm:max-w-lg',
                lg: 'sm:max-w-2xl',
                xl: 'sm:max-w-4xl',
                full: 'sm:max-w-6xl',
            },
            layout: {
                padded: 'grid max-h-[calc(100dvh-1.5rem)] gap-4 overflow-y-auto p-(--brand-card-padding)',
                structured: 'flex max-h-[calc(100dvh-1.5rem)] flex-col',
            },
            mobile: {
                inset: '',
                // Phones: edge-to-edge sheet-like dialog; from `sm` up it is the normal centered modal.
                fullscreen: 'max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0',
            },
        },
        defaultVariants: { size: 'default', layout: 'padded', mobile: 'inset' },
    },
);

interface DialogContentProps
    extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'size'>,
        Omit<VariantProps<typeof dialogVariants>, 'layout'> {
    /** `structured`: use `DialogHeader` + `DialogBody` + `DialogFooter` (body scrolls, header/footer stay put). */
    structured?: boolean;
    /** While true the dialog can't be closed (Esc, outside click, ×) — for submitting/saving. */
    busy?: boolean;
    /** `false` ignores outside clicks (still closable by Esc/×/buttons). Use for forms and confirmations. Default true. */
    dismissible?: boolean;
    /** Hide the × (e.g. an alert that must be acknowledged with its button). */
    hideClose?: boolean;
}

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
    (
        { className, children, size, mobile, structured = false, busy = false, dismissible = true, hideClose = false, onEscapeKeyDown, onInteractOutside, ...props },
        ref,
    ) => (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                ref={ref}
                aria-busy={busy || undefined}
                className={cn(dialogVariants({ size, mobile, layout: structured ? 'structured' : 'padded' }), className)}
                onEscapeKeyDown={(event) => {
                    if (busy) {
                        event.preventDefault();
                    }

                    onEscapeKeyDown?.(event);
                }}
                onInteractOutside={(event) => {
                    if (busy || !dismissible) {
                        event.preventDefault();
                    }

                    onInteractOutside?.(event);
                }}
                {...props}
            >
                <DialogLayoutContext.Provider value={{ structured }}>{children}</DialogLayoutContext.Provider>
                {!hideClose && (
                    <DialogPrimitive.Close
                        disabled={busy}
                        className="text-muted-foreground hover:bg-brand-secondary hover:text-foreground focus-visible:ring-brand-focus-ring absolute top-3 right-3 flex size-8 items-center justify-center rounded-[calc(var(--brand-control-radius)-2px)] motion-colors outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40"
                    >
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    ),
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const ICON_TONES = {
    default: 'bg-brand-secondary text-muted-foreground',
    primary: 'bg-brand-primary/10 text-brand-primary-text',
    success: 'bg-brand-success/10 text-brand-success-text',
    warning: 'bg-brand-warning/15 text-brand-warning-text',
    danger: 'bg-brand-danger/10 text-brand-danger-text',
    info: 'bg-brand-info/10 text-brand-info-text',
} as const;

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Optional leading icon (e.g. a lucide icon) shown in a small tinted chip. */
    icon?: React.ReactNode;
    iconTone?: keyof typeof ICON_TONES;
}

/** Title + description (+ optional icon). Leaves room on the right for the close button. */
const DialogHeader = ({ className, icon, iconTone = 'default', children, ...props }: DialogHeaderProps) => {
    const { structured } = React.useContext(DialogLayoutContext);

    return (
        <div
            data-slot="dialog-header"
            className={cn('flex items-start gap-3 pr-9', structured && 'border-brand-card-border border-b px-(--brand-card-padding) py-4', className)}
            {...props}
        >
            {icon && (
                <span
                    className={cn('flex size-9 shrink-0 items-center justify-center rounded-[calc(var(--brand-control-radius)-2px)] [&_svg]:size-5', ICON_TONES[iconTone])}
                    aria-hidden="true"
                >
                    {icon}
                </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">{children}</div>
        </div>
    );
};
DialogHeader.displayName = 'DialogHeader';

/** Scrolling content area of a `structured` dialog. */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-slot="dialog-body" className={cn('scrollbar-thin min-h-0 flex-1 overflow-y-auto px-(--brand-card-padding) py-4', className)} {...props} />
);
DialogBody.displayName = 'DialogBody';

/**
 * Actions row. Right-aligned on desktop; on phones the buttons stack full-width with the primary
 * action on top. Inside a `structured` dialog it becomes a tinted strip pinned under the body.
 */
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    const { structured } = React.useContext(DialogLayoutContext);

    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                'flex items-center justify-end gap-2 max-sm:flex-col-reverse max-sm:items-stretch',
                structured && 'border-brand-card-border bg-brand-card-footer border-t px-(--brand-card-padding) py-3',
                className,
            )}
            {...props}
        />
    );
};
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
    ({ className, ...props }, ref) => (
        <DialogPrimitive.Title ref={ref} className={cn('text-base leading-snug font-semibold tracking-tight', className)} {...props} />
    ),
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn('text-muted-foreground text-sm leading-5', className)} {...props} />);
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};
