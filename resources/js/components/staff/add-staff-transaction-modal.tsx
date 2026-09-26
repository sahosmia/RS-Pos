import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type Account, type StaffTransactionTypeOption } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';

interface AddStaffTransactionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staffId: number;
    transactionTypes: StaffTransactionTypeOption[];
    accounts: Account[];
}

/** Types are an admin-manageable lookup (not a fixed list), so the account field's visibility follows the selected type's `nature`, not a hardcoded type name. */
export default function AddStaffTransactionModal({ open, onOpenChange, staffId, transactionTypes, accounts }: AddStaffTransactionModalProps) {
    const form = useForm({
        staff_transaction_type_id: transactionTypes[0]?.id ?? 0,
        amount: 0,
        account_id: null as number | null,
        note: '',
    });

    useEffect(() => {
        if (open) {
            form.setData({ staff_transaction_type_id: transactionTypes[0]?.id ?? 0, amount: 0, account_id: null, note: '' });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const selectedType = transactionTypes.find((type) => type.id === form.data.staff_transaction_type_id);
    const needsAccount = selectedType ? ['settlement', 'advance'].includes(selectedType.nature) : false;

    const typeOptions = transactionTypes.map((type) => ({ value: String(type.id), label: type.name }));
    const accountOptions = accounts.map((account) => ({ value: String(account.id), label: account.name }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('staff.transactions.store', staffId), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Add Transaction"
            submitLabel="Add Transaction"
            processing={form.processing}
            onSubmit={submit}
        >
            <FormSelect
                id="staff_transaction_type_id"
                label="Type"
                value={form.data.staff_transaction_type_id}
                onChange={(val) => val && form.setData('staff_transaction_type_id', Number(val))}
                options={typeOptions}
                placeholder="Select type"
                error={form.errors.staff_transaction_type_id}
            />

            <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <MoneyInput id="amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} required />
                {selectedType?.effect_on_balance && (
                    <p className="text-muted-foreground text-xs">
                        {selectedType.effect_on_balance === 'increase'
                            ? 'staff balance বাড়বে (staff কোম্পানির কাছে ঋণী হবে)'
                            : 'staff balance কমবে (কোম্পানি staff-এর কাছে ঋণী হবে)'}
                    </p>
                )}
                <InputError message={form.errors.amount} />
            </div>

            {needsAccount && (
                <FormSelect
                    id="account_id"
                    label="Account"
                    value={form.data.account_id}
                    onChange={(val) => val && form.setData('account_id', Number(val))}
                    options={accountOptions}
                    placeholder="Select an account"
                    error={form.errors.account_id}
                />
            )}

            <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} rows={2} />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
