import AccountPaymentRows, { paymentRowsError, type PaymentRow } from '@/components/shared/account-payment-rows';
import FormModal from '@/components/shared/form-modal';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface AddSalePaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Only these three fields are used — both the show page's full `SaleDetail` and the list's leaner `SaleListItem` satisfy this. */
    sale: { id: number; invoice_no: string; due_amount: number };
    accounts: Account[];
}

export default function AddSalePaymentModal({ open, onOpenChange, sale, accounts }: AddSalePaymentModalProps) {
    const money = useMoneyFormat();
    const [rows, setRows] = useState<PaymentRow[]>([]);

    const form = useForm({ payments: [] as PaymentRow[] });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({ ...data, payments: rows.filter((row) => row.account_id && row.amount > 0) }));

        form.post(route('sales.payments.store', sale.id), {
            preserveScroll: true,
            onSuccess: () => {
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
            description={`${sale.invoice_no} — বকেয়া: ${money(sale.due_amount)}`}
            submitLabel="Record Payment"
            processing={form.processing}
            onSubmit={submit}
        >
            <AccountPaymentRows accounts={accounts} rows={rows} onChange={setRows} total={sale.due_amount} error={paymentRowsError(form.errors)} />
        </FormModal>
    );
}
