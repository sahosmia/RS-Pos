import { FormInput } from '@/components/form/form-input';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import { type JournalEntryListItem } from '@/types/models';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface ReverseEntryDialogProps {
    /** The entry being reversed; null keeps the dialog closed. */
    entry: JournalEntryListItem | null;
    onClose: () => void;
}

/** Confirms reversing a journal entry. A reason is required — the original is never edited or deleted. */
export function ReverseEntryDialog({ entry, onClose }: ReverseEntryDialogProps) {
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);

    // each entry starts with an empty reason
    useEffect(() => {
        if (entry) setReason('');
    }, [entry]);

    const confirm = () => {
        if (!entry) return;

        setProcessing(true);
        router.post(
            route('journal-entries.reverse', entry.id),
            { reason },
            {
                onFinish: () => {
                    setProcessing(false);
                    onClose();
                },
            },
        );
    };

    return (
        <ConfirmDialog
            open={entry !== null}
            onOpenChange={(open) => !open && onClose()}
            title="Reverse this journal entry?"
            description="একটা নতুন mirrored entry (debit/credit উল্টে) পোস্ট হবে, আর এই entry-টা reversed হিসেবে মার্ক হবে — original কখনো এডিট/ডিলিট হয় না।"
            confirmLabel="Reverse"
            processing={processing}
            confirmDisabled={reason.trim() === ''}
            onConfirm={confirm}
        >
            <div className="pt-2">
                <FormInput id="reason" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>
        </ConfirmDialog>
    );
}
