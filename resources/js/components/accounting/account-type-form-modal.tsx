import { FormInput } from '@/components/form/form-input';
import FormModal from '@/components/shared/form-modal';
import { type AccountTypeListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect } from 'react';

interface AccountTypeFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The type being edited; null adds a new one. */
    editing: AccountTypeListItem | null;
}

/** Add or rename an account type (Cash, Bank, Bkash…) — the list the Account form's "Account Type" dropdown shows. */
export function AccountTypeFormModal({ open, onOpenChange, editing }: AccountTypeFormModalProps) {
    const form = useForm({ name: '' });

    // every time the modal opens it shows the type being edited, or a blank form
    useEffect(() => {
        if (!open) return;

        form.clearErrors();
        form.setData('name', editing?.name ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (editing) {
            form.patch(route('account-types.update', editing.id), options);
        } else {
            form.post(route('account-types.store'), options);
        }
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? 'Edit Account Type' : 'Add Account Type'}
            processing={form.processing}
            onSubmit={submit}
        >
            <FormInput
                id="type_name"
                label="Type Name"
                placeholder="Bkash, Nagad, Card..."
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                error={form.errors.name}
                required
            />
        </FormModal>
    );
}
