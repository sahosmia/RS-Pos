import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type AccountListItem, type AccountTypeListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect } from 'react';

interface AccountFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The account being edited; null adds a new one. */
    editing: AccountListItem | null;
    accountTypes: AccountTypeListItem[];
}

/** Add or edit a payment account (cash, bank, mobile banking…). The opening balance locks once it has transactions. */
export function AccountFormModal({ open, onOpenChange, editing, accountTypes }: AccountFormModalProps) {
    const form = useForm({
        name: '',
        account_type_id: '' as string | number,
        account_sub_type: '',
        account_number: '',
        opening_balance: 0 as number | string,
        is_active: true as boolean,
        is_default: false as boolean,
    });

    // every time the modal opens it shows the account being edited, or a blank form
    useEffect(() => {
        if (!open) return;

        form.clearErrors();
        form.setData({
            name: editing?.name ?? '',
            account_type_id: editing?.account_type_id ?? '',
            account_sub_type: editing?.account_sub_type ?? '',
            account_number: editing?.account_number ?? '',
            opening_balance: editing?.opening_balance ?? 0,
            is_active: editing?.is_active ?? true,
            is_default: editing?.is_default ?? false,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (editing) {
            form.patch(route('accounts.update', editing.id), options);
        } else {
            form.post(route('accounts.store'), options);
        }
    };

    const openingLocked = editing !== null && !editing.can_edit_opening_balance;

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? 'Edit Account' : 'Add Account'}
            processing={form.processing}
            onSubmit={submit}
        >
            <FormInput
                id="name"
                label="Account Name"
                placeholder="e.g. Main Cash, City Bank..."
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                error={form.errors.name}
                required
            />

            <FormSelect
                id="account_type_id"
                label="Account Type"
                value={form.data.account_type_id}
                onChange={(val) => form.setData('account_type_id', val ? Number(val) : '')}
                options={accountTypes.map((type) => ({ value: String(type.id), label: type.name }))}
                placeholder="Select account type"
                allowNone
                noneLabel="Select account type"
                error={form.errors.account_type_id}
            />

            <FormInput
                id="account_sub_type"
                label="Sub Type"
                placeholder="Bkash Agent, Nagad..."
                value={form.data.account_sub_type}
                onChange={(e) => form.setData('account_sub_type', e.target.value)}
                error={form.errors.account_sub_type}
            />

            <FormInput
                id="account_number"
                label="Account Number"
                placeholder="e.g. 1234567890"
                value={form.data.account_number}
                onChange={(e) => form.setData('account_number', e.target.value)}
                error={form.errors.account_number}
            />

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="opening_balance">Opening Balance</Label>
                <MoneyInput
                    id="opening_balance"
                    placeholder="0.00"
                    value={form.data.opening_balance}
                    disabled={openingLocked}
                    onChange={(e) => form.setData('opening_balance', e.target.value === '' ? '' : Number(e.target.value))}
                />
                {openingLocked && (
                    <p className="text-muted-foreground text-xs">
                        এই account-এ লেনদেন হয়ে গেছে — opening balance আর বদলানো যাবে না, adjustment দিতে হবে।
                    </p>
                )}
                <InputError message={form.errors.opening_balance} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="space-y-0.5">
                    <Label htmlFor="is_default">Is default</Label>
                    <p className="text-muted-foreground text-sm">পেমেন্ট ফর্মে এই account প্রথম row-এ অটো সিলেক্ট হবে</p>
                </div>
                <Switch id="is_default" checked={form.data.is_default} onCheckedChange={(checked) => form.setData('is_default', checked)} />
            </div>

            {editing && (
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <Label htmlFor="is_active">Active</Label>
                        <p className="text-muted-foreground text-sm">বন্ধ করলে নতুন লেনদেনে এই account দেখাবে না</p>
                    </div>
                    <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked)} />
                </div>
            )}
        </FormModal>
    );
}
