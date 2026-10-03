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
    const needsAccount = selectedType ? ['salary', 'settlement', 'advance', 'advance_return'].includes(selectedType.nature) : false;

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
                required
            />

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="amount" required>Amount</Label>
                <MoneyInput id="amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} placeholder="0.00" required />
                {selectedType?.effect_on_balance && (
                    <p className="text-muted-foreground text-xs">
                        {{
                            increase: 'staff balance বাড়বে (staff কোম্পানির কাছে ঋণী হবে)',
                            decrease: 'staff balance কমবে (staff তার advance ফেরত দিচ্ছে)',
                            none: 'বেতন সরাসরি খরচ হিসেবে যাবে — staff balance বদলাবে না',
                        }[selectedType.effect_on_balance]}
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
                    required
                />
            )}

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} placeholder="e.g. Transaction note or reference details" rows={2} />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
