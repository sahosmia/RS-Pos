import AccountPaymentRows, { type PaymentRow } from '@/components/shared/account-payment-rows';
import FormModal from '@/components/shared/form-modal';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type SalesOrderDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface ConvertSalesOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: SalesOrderDetail;
    accounts: Account[];
}

export default function ConvertSalesOrderModal({ open, onOpenChange, order, accounts }: ConvertSalesOrderModalProps) {
    const money = useMoneyFormat();
    const [rows, setRows] = useState<PaymentRow[]>([]);

    const form = useForm({ payments: [] as PaymentRow[] });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({ ...data, payments: rows.filter((row) => row.account_id && row.amount > 0) }));

        form.post(route('sales-orders.convert', order.id), {
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
            title="Convert to Sale"
            description={`${order.order_no} — অগ্রিম ${money(order.advance_paid)} ইতিমধ্যে নেওয়া হয়েছে, বাকি ${money(order.due_amount)}`}
            submitLabel="Convert to Sale"
            processing={form.processing}
            onSubmit={submit}
        >
            <AccountPaymentRows
                accounts={accounts}
                rows={rows}
                onChange={setRows}
                label="Additional Payment (optional)"
                emptyHint="বাকি টাকা এখন না নিলে Sale-এ due হিসেবে থেকে যাবে"
            />
        </FormModal>
    );
}
