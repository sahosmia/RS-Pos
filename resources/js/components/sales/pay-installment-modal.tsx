import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { type Account, type EmiInstallmentListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect } from 'react';

interface PayInstallmentModalProps {
    /** The installment being paid; null keeps the modal closed. */
    installment: EmiInstallmentListItem | null;
    onClose: () => void;
    accounts: Account[];
}

/** Record a payment against one EMI installment: which account it went into, and how much (defaults to what's left). */
export function PayInstallmentModal({ installment, onClose, accounts }: PayInstallmentModalProps) {
    const form = useForm({ account_id: 0, amount: 0 });

    // every time an installment is picked the form starts with the first account and the amount still owed
    useEffect(() => {
        if (!installment) return;

        form.clearErrors();
        form.setData({ account_id: accounts[0]?.id ?? 0, amount: installment.amount - installment.paid_amount });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [installment]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!installment || form.processing) return;

        form.post(route('emi-installments.pay', installment.id), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <FormModal
            open={installment !== null}
            onOpenChange={(open) => !open && onClose()}
            title={`Pay Installment #${installment?.installment_number ?? ''}`}
            description={installment ? `${installment.invoice_no} — ${installment.customer.name}` : undefined}
            submitLabel="Record Payment"
            processing={form.processing}
            onSubmit={submit}
        >
            <FormSelect
                id="account_id"
                label="Account"
                value={form.data.account_id}
                onChange={(val) => val && form.setData('account_id', Number(val))}
                options={accounts.map((account) => ({ value: String(account.id), label: account.name }))}
                error={form.errors.account_id}
            />

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="amount">Amount</Label>
                <MoneyInput id="amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} />
                <InputError message={form.errors.amount} />
            </div>
        </FormModal>
    );
}
