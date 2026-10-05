import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { today } from '@/lib/format-date';
import { type Account, type AssetListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface AssetFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The asset being edited; null adds a new one. */
    editing: AssetListItem | null;
    accounts: Account[];
}

/**
 * Add or edit an asset. A new asset is either one the shop already owned (an opening value, no account touched)
 * or one bought now (a purchase amount paid from an account).
 */
export function AssetFormModal({ open, onOpenChange, editing, accounts }: AssetFormModalProps) {
    const form = useForm({
        asset_type: 'new' as 'existing' | 'new',
        name: '',
        purchase_date: today(),
        opening_value: 0,
        purchase_amount: 0,
        account_id: null as number | null,
    });

    // every time the modal opens it shows the asset being edited, or a blank "new asset" form
    useEffect(() => {
        if (!open) return;

        form.clearErrors();
        form.setData(
            editing
                ? {
                      asset_type: 'existing',
                      purchase_amount: 0,
                      account_id: null,
                      name: editing.name,
                      purchase_date: editing.purchase_date ?? '',
                      opening_value: editing.opening_value,
                  }
                : {
                      asset_type: 'new',
                      name: '',
                      purchase_date: today(),
                      opening_value: 0,
                      purchase_amount: 0,
                      account_id: accounts.find((account) => account.is_default)?.id ?? accounts[0]?.id ?? null,
                  },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'Asset updated.' : 'Asset added.');
                onOpenChange(false);
            },
        };

        if (editing) {
            form.patch(route('assets.update', editing.id), options);
        } else {
            form.post(route('assets.store'), options);
        }
    };

    const openingLocked = editing !== null && !editing.can_edit_opening_value;

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? 'Edit Asset' : 'Add Asset'}
            processing={form.processing}
            onSubmit={submit}
        >
            {!editing && (
                <FormSelect
                    id="asset_type"
                    label="Asset Type"
                    value={form.data.asset_type}
                    onChange={(value) => form.setData('asset_type', value === 'new' ? 'new' : 'existing')}
                    options={[
                        { value: 'existing', label: 'Existing asset — আগে থেকেই আছে' },
                        { value: 'new', label: 'New asset — এখন কিনলাম' },
                    ]}
                    required
                />
            )}

            <FormInput
                id="name"
                label="Name"
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                error={form.errors.name}
                placeholder="e.g. Office Chair, Laptop, Delivery Van"
                required
            />

            <FormInput
                id="purchase_date"
                label="Purchase Date"
                type="date"
                value={form.data.purchase_date}
                onChange={(e) => form.setData('purchase_date', e.target.value)}
                error={form.errors.purchase_date}
            />

            {(editing !== null || form.data.asset_type === 'existing') && (
                <MoneyInput
                    id="opening_value"
                    label="Opening Value"
                    value={form.data.opening_value}
                    disabled={openingLocked}
                    onChange={(e) => form.setData('opening_value', Number(e.target.value))}
                    error={form.errors.opening_value}
                    required={editing !== null}
                    helperText={
                        openingLocked
                            ? 'এই asset-এ লেনদেন হয়ে গেছে — opening value আর বদলানো যাবে না।'
                            : 'ঐচ্ছিক — খালি রাখলে ০ ধরা হবে। কোনো account-এ হিট করবে না।'
                    }
                />
            )}

            {!editing && form.data.asset_type === 'new' && (
                <>
                    <MoneyInput
                        id="purchase_amount"
                        label="Purchase Amount"
                        value={form.data.purchase_amount}
                        onChange={(e) => form.setData('purchase_amount', Number(e.target.value))}
                        error={form.errors.purchase_amount}
                        required
                    />

                    <FormSelect
                        id="account_id"
                        label="Paid From Account"
                        value={form.data.account_id}
                        onChange={(value) => form.setData('account_id', value ? Number(value) : null)}
                        options={accounts.map((account) => ({ value: String(account.id), label: account.name }))}
                        placeholder="Select account"
                        error={form.errors.account_id}
                        helperText="Purchase Amount এই account থেকে কাটা হবে।"
                        required
                    />
                </>
            )}
        </FormModal>
    );
}
