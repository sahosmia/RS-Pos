import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type ComponentProps, FormEventHandler, ReactNode } from 'react';

interface FormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    submitLabel?: string;
    cancelLabel?: string;
    processing?: boolean;
    onSubmit: FormEventHandler;
    children: ReactNode;
    /** Dialog width: `sm` / `default` / `lg` / `xl` / `full`. Prefer this over `contentClassName`. */
    size?: ComponentProps<typeof DialogContent>['size'];
    /** Overrides the dialog's width classes — e.g. `sm:max-w-4xl` for a content-heavy form (doc/corrections2.md #5). */
    contentClassName?: string;
    /** Header icon chip, e.g. `<Pencil />`. */
    icon?: ReactNode;
    /** Extra content on the left of the footer (a hint, a secondary link, a total). */
    footerStart?: ReactNode;
    /** Phones: `fullscreen` for long forms. Default keeps the inset modal. */
    mobile?: ComponentProps<typeof DialogContent>['mobile'];
}

/**
 * Form in a dialog: fixed header, scrolling body (put Label/Input/Select/... fields in `children`),
 * pinned Cancel/Submit footer. While `processing` the dialog can't be closed and Submit shows a spinner
 * at its normal width, so nothing jumps and double-submits are impossible.
 */
export default function FormModal({
    open,
    onOpenChange,
    title,
    description,
    submitLabel = 'Save',
    cancelLabel = 'Cancel',
    processing = false,
    onSubmit,
    children,
    size,
    contentClassName,
    icon,
    footerStart,
    mobile,
}: FormModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent structured busy={processing} size={size} mobile={mobile} className={contentClassName}>
                <DialogHeader icon={icon} iconTone="primary">
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                {/*
                 * Radix's Dialog portals this <form> to document.body, so in the real DOM it's
                 * never nested inside a page's own <form> — but React re-plays bubbling along the
                 * *component* tree for portaled content, not the DOM tree. Any FormModal rendered
                 * as a JSX child of another <form> (e.g. a discount/financing modal inside the
                 * Sale form) would otherwise have its Apply button's submit event bubble up and
                 * trigger that outer form's onSubmit too. stopPropagation keeps this modal's
                 * submit local to itself regardless of where it's rendered from.
                 */}
                <form
                    onSubmit={(e) => {
                        e.stopPropagation();
                        onSubmit(e);
                    }}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <DialogBody className="space-y-4">{children}</DialogBody>

                    <DialogFooter className={footerStart ? 'sm:justify-between' : undefined}>
                        {footerStart && <div className="text-muted-foreground text-sm max-sm:hidden">{footerStart}</div>}
                        <div className="flex items-center gap-2 max-sm:flex-col-reverse max-sm:items-stretch">
                            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={processing}>
                                {cancelLabel}
                            </Button>
                            <Button type="submit" variant="primary" loading={processing}>
                                {submitLabel}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
