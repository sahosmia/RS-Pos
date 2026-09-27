import AccountPaymentRows, { paymentRowsError, type PaymentRow } from '@/components/shared/account-payment-rows';
import FormModal from '@/components/shared/form-modal';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type ExpenseListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface AddExpensePaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expense: ExpenseListItem;
    accounts: Account[];
}

export default function AddExpensePaymentModal({ open, onOpenChange, expense, accounts }: AddExpensePaymentModalProps) {
    const money = useMoneyFormat();
    const [rows, setRows] = useState<PaymentRow[]>([]);

    const form = useForm({ payments: [] as PaymentRow[] });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({ ...data, payments: rows.filter((row) => row.account_id && row.amount > 0) }));

        form.post(route('expenses.payments.store', expense.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Payment recorded.');
                onOpenChange(false);
                setRows([]);
            },
            onError: (errors) => toast.error(paymentRowsError(errors) ?? 'Could not record the payment — check the form for errors.'),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Add Payment"
            description={`${expense.category.name} — বকেয়া: ${money(expense.due_amount)}`}
            submitLabel="Record Payment"
            processing={form.processing}
            onSubmit={submit}
        >
            <AccountPaymentRows
                accounts={accounts}
                rows={rows}
                onChange={setRows}
                label="Payment"
                emptyHint="অন্তত একটা account যোগ করুন"
                total={expense.due_amount}
                error={paymentRowsError(form.errors)}
            />
        </FormModal>
    );
}
