import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CircleCheck, HelpCircle, Trash2 } from 'lucide-react';
import { type ReactNode, useRef } from 'react';

type ConfirmTone = 'destructive' | 'warning' | 'success' | 'primary';

const TONES: Record<
    ConfirmTone,
    { icon: ReactNode; iconTone: 'danger' | 'warning' | 'success' | 'primary'; button: 'destructive' | 'warning' | 'success' | 'primary' }
> = {
    destructive: { icon: <Trash2 />, iconTone: 'danger', button: 'destructive' },
    warning: { icon: <AlertTriangle />, iconTone: 'warning', button: 'warning' },
    success: { icon: <CircleCheck />, iconTone: 'success', button: 'success' },
    primary: { icon: <HelpCircle />, iconTone: 'primary', button: 'primary' },
};

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    processing?: boolean;
    confirmDisabled?: boolean;
    onConfirm: () => void;
    /** Colour/icon/button of the confirm action: delete/cancel → `destructive` (default), restore → `primary`, approve → `success`. */
    tone?: ConfirmTone;
    /** Extra content under the description, e.g. a reason field. */
    children?: ReactNode;
}

/**
 * "Are you sure?" dialog. Behaves as an alertdialog: focus starts on Cancel (the safe choice),
 * outside clicks don't dismiss it, and while `processing` it can't be closed or confirmed twice.
 * It performs no action itself — the caller's `onConfirm` does.
 */
export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    processing = false,
    confirmDisabled = false,
    onConfirm,
    tone = 'destructive',
    children,
}: ConfirmDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const style = TONES[tone];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                size="sm"
                role="alertdialog"
                busy={processing}
                dismissible={false}
                hideClose
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    cancelRef.current?.focus();
                }}
            >
                <DialogHeader icon={style.icon} iconTone={style.iconTone} className="pr-0">
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                {children}

                <DialogFooter>
                    <Button ref={cancelRef} type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={processing}>
                        {cancelLabel}
                    </Button>
                    <Button type="button" variant={style.button} loading={processing} disabled={confirmDisabled} onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
