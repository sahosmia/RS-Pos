import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormEventHandler, ReactNode } from 'react';

interface FormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    submitLabel?: string;
    processing?: boolean;
    onSubmit: FormEventHandler;
    children: ReactNode;
    /** Overrides the dialog's default `max-w-lg` — e.g. `sm:max-w-4xl` for a content-heavy form (doc/corrections2.md #5). */
    contentClassName?: string;
}

export default function FormModal({
    open,
    onOpenChange,
    title,
    description,
    submitLabel = 'Save',
    processing = false,
    onSubmit,
    children,
    contentClassName,
}: FormModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={contentClassName}>
                <DialogHeader>
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
                    className="space-y-4"
                >
                    {children}

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving...' : submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
