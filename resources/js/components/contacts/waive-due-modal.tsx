import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type ContactDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';

interface WaiveDueModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contact: ContactDetail;
}

/**
 * Ledger-level discount (Task 6.7) — forgives part of what a contact owes,
 * unrelated to any specific sale (loyalty, goodwill).
 */
export default function WaiveDueModal({ open, onOpenChange, contact }: WaiveDueModalProps) {
    const form = useForm({ amount: 0, note: '' });

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData({ amount: 0, note: '' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('contacts.due-waivers.store', contact.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Add Discount"
            description={`বর্তমান অবস্থা: ${contact.balance_label} — কোনো cash movement হবে না, শুধু বকেয়া মাফ`}
            submitLabel="Waive"
            processing={form.processing}
            onSubmit={submit}
        >
            <div className="grid gap-2">
                <Label htmlFor="waive_amount">Amount</Label>
                <MoneyInput id="waive_amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} required />
                <InputError message={form.errors.amount} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="waive_note">Reason</Label>
                <Textarea
                    id="waive_note"
                    placeholder="loyalty, goodwill..."
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
