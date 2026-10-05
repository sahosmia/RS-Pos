import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { today } from '@/lib/format-date';
import { type AccountListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

interface FundTransferModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accounts: AccountListItem[];
}

/** Move money between two of the shop's own accounts. */
export function FundTransferModal({ open, onOpenChange, accounts }: FundTransferModalProps) {
    const money = useMoneyFormat();
    const form = useForm({ from_account_id: 0, to_account_id: 0, amount: 0, transfer_date: today(), note: '' });

    const options = accounts.map((account) => ({ value: String(account.id), label: `${account.name} — ${money(account.current_balance)}` }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('fund-transfers.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Fund Transfer"
            description="নিজের দুই account-এর মধ্যে টাকা সরানো"
            submitLabel="Transfer"
            processing={form.processing}
            onSubmit={submit}
        >
            <FormSelect
                id="from_account_id"
                label="From"
                required
                value={form.data.from_account_id}
                onChange={(val) => val && form.setData('from_account_id', Number(val))}
                options={options}
                placeholder="Select an account"
                error={form.errors.from_account_id}
            />

            <FormSelect
                id="to_account_id"
                label="To"
                required
                value={form.data.to_account_id}
                onChange={(val) => val && form.setData('to_account_id', Number(val))}
                options={options}
                placeholder="Select an account"
                error={form.errors.to_account_id}
            />

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="amount" required>
                    Amount
                </Label>
                <MoneyInput id="amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} required />
                <InputError message={form.errors.amount} />
            </div>

            <FormInput
                id="transfer_date"
                label="Date"
                type="date"
                value={form.data.transfer_date}
                onChange={(e) => form.setData('transfer_date', e.target.value)}
                error={form.errors.transfer_date}
                required
            />

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                    id="note"
                    placeholder="Add a note (optional)"
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
