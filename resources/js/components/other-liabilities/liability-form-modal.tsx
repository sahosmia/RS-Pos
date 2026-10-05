import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { type OtherLiabilityListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface LiabilityFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The liability being edited; null adds a new one. */
    editing: OtherLiabilityListItem | null;
}

/** Add or edit an "other liability" — a name and its opening amount (locked once transactions exist). */
export function LiabilityFormModal({ open, onOpenChange, editing }: LiabilityFormModalProps) {
    const form = useForm({ name: '', opening_amount: 0 });

    // every time the modal opens it shows the liability being edited, or a blank form
    useEffect(() => {
        if (!open) return;

        form.clearErrors();
        form.setData({ name: editing?.name ?? '', opening_amount: editing?.opening_amount ?? 0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'Liability updated.' : 'Liability added.');
                onOpenChange(false);
            },
        };

        if (editing) {
            form.patch(route('other-liabilities.update', editing.id), options);
        } else {
            form.post(route('other-liabilities.store'), options);
        }
    };

    const openingLocked = editing !== null && !editing.can_edit_opening_amount;

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? 'Edit Liability' : 'Add Liability'}
            processing={form.processing}
            onSubmit={submit}
        >
            <FormInput
                id="name"
                label="Name"
                placeholder="Unpaid Tax 2024, Personal loan from brother..."
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                error={form.errors.name}
                required
            />

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="opening_amount" required={editing !== null}>
                    Opening Amount
                </Label>
                <MoneyInput
                    id="opening_amount"
                    value={form.data.opening_amount}
                    disabled={openingLocked}
                    onChange={(e) => form.setData('opening_amount', Number(e.target.value))}
                    required={editing !== null}
                />
                {openingLocked && (
                    <p className="text-muted-foreground text-xs">এই liability-তে লেনদেন হয়ে গেছে — opening amount আর বদলানো যাবে না।</p>
                )}
                <InputError message={form.errors.opening_amount} />
            </div>
        </FormModal>
    );
}
