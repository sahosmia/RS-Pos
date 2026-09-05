import AccountPaymentRows, { type PaymentRow } from '@/components/shared/account-payment-rows';
import FormModal from '@/components/shared/form-modal';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type PurchaseReturnDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface RefundPurchaseReturnModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseReturn: PurchaseReturnDetail;
    accounts: Account[];
}

export default function RefundPurchaseReturnModal({ open, onOpenChange, purchaseReturn, accounts }: RefundPurchaseReturnModalProps) {
    const money = useMoneyFormat();
    const [rows, setRows] = useState<PaymentRow[]>([]);

    const form = useForm({ payments: [] as PaymentRow[] });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({ ...data, payments: rows.filter((row) => row.account_id && row.amount > 0) }));

        form.post(route('purchase-returns.refund', purchaseReturn.id), {
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
            title="Refund Payment"
            description={`Return #${purchaseReturn.id} — মোট: ${money(purchaseReturn.total_amount)}`}
            submitLabel="Record Refund"
            processing={form.processing}
            onSubmit={submit}
        >
            <AccountPaymentRows accounts={accounts} rows={rows} onChange={setRows} />
        </FormModal>
    );
}
