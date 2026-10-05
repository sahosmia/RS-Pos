import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { type InvestorListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface InvestorFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The investor being edited; null adds a new one. */
    editing: InvestorListItem | null;
}

/** Add or edit an investor: name, phone, the capital they had put in before the system (locked once transactions exist) and a note. */
export function InvestorFormModal({ open, onOpenChange, editing }: InvestorFormModalProps) {
    const form = useForm({ name: '', phone: '', note: '', opening_amount: 0 });

    // every time the modal opens it shows the investor being edited, or a blank form
    useEffect(() => {
        if (!open) return;

        form.clearErrors();
        form.setData({
            name: editing?.name ?? '',
            phone: editing?.phone || '',
            note: editing?.note || '',
            opening_amount: editing?.opening_amount ?? 0,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'Investor updated.' : 'Investor added.');
                onOpenChange(false);
            },
        };

        if (editing) {
            form.patch(route('investors.update', editing.id), options);
        } else {
            form.post(route('investors.store'), options);
        }
    };

    const openingLocked = editing !== null && !editing.can_edit_opening_amount;

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? 'Edit Investor' : 'Add Investor'}
            processing={form.processing}
            onSubmit={submit}
        >
            <FormInput
                id="name"
                label="Name"
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                placeholder="e.g. Rafiqul Islam"
                error={form.errors.name}
                required
            />

            <FormInput
                id="phone"
                label="Phone Number"
                value={form.data.phone}
                onChange={(e) => form.setData('phone', e.target.value)}
                placeholder="e.g. 01712345678"
                error={form.errors.phone}
            />

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="opening_amount" required={editing !== null}>
                    Opening Balance
                </Label>
                <MoneyInput
                    id="opening_amount"
                    value={form.data.opening_amount}
                    disabled={openingLocked}
                    onChange={(e) => form.setData('opening_amount', Number(e.target.value))}
                    required={editing !== null}
                />
                <p className="text-muted-foreground text-xs">
                    সিস্টেমে আসার আগে এই investor যে মূলধন আগেই দিয়েছেন (কোনো account-এর টাকা বাড়বে না)।
                </p>
                {openingLocked && (
                    <p className="text-muted-foreground text-xs">এই investor-এর লেনদেন হয়ে গেছে — opening balance আর বদলানো যাবে না।</p>
                )}
                <InputError message={form.errors.opening_amount} />
            </div>

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="note">Note</Label>
                <textarea
                    id="note"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                    placeholder="e.g. Initial investor agreement details"
                />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
