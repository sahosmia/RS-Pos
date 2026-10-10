import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CircleCheck, CircleX, Info } from 'lucide-react';
import { type ReactNode, useRef } from 'react';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, { icon: ReactNode }> = {
    info: { icon: <Info /> },
    success: { icon: <CircleCheck /> },
    warning: { icon: <AlertTriangle /> },
    danger: { icon: <CircleX /> },
};

interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    /** `danger` for errors, `warning` for cautions, `info`/`success` for notices. */
    tone?: AlertTone;
    /** Label of the single acknowledge button. */
    actionLabel?: string;
    /** Details under the description (a list of problems, a message from the server). */
    children?: ReactNode;
}

/**
 * Message the user must acknowledge — no decision to make (use `ConfirmDialog` for those).
 * Announced as an alertdialog; only the button, Esc or the × dismiss it, never an outside click.
 */
export default function AlertDialog({ open, onOpenChange, title, description, tone = 'warning', actionLabel = 'Got it', children }: AlertDialogProps) {
    const actionRef = useRef<HTMLButtonElement>(null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                size="sm"
                role="alertdialog"
                dismissible={false}
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    actionRef.current?.focus();
                }}
            >
                <DialogHeader icon={TONES[tone].icon} iconTone={tone}>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                {children}

                <DialogFooter>
                    <Button ref={actionRef} type="button" variant="primary" onClick={() => onOpenChange(false)}>
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
