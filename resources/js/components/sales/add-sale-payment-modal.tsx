import AccountPaymentRows, { type PaymentRow } from '@/components/shared/account-payment-rows';
import FormModal from '@/components/shared/form-modal';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type SaleDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface AddSalePaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sale: SaleDetail;
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
            <AccountPaymentRows accounts={accounts} rows={rows} onChange={setRows} />
        </FormModal>
    );
}
