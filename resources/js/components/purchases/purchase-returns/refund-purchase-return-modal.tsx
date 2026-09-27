import AccountPaymentRows, { paymentRowsError, type PaymentRow } from '@/components/shared/account-payment-rows';
import FormModal from '@/components/shared/form-modal';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type PurchaseReturnDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

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
            onError: (errors) =>
                toast.error(paymentRowsError(errors) ?? errors.payments ?? 'Could not record the refund — check the form for errors.'),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Refund Payment"
            description={`Return #${purchaseReturn.id} — মোট: ${money(purchaseReturn.total_amount)}, বাকি ফেরতযোগ্য: ${money(purchaseReturn.remaining_refundable)}`}
            submitLabel="Record Refund"
            processing={form.processing}
            onSubmit={submit}
        >
            <AccountPaymentRows
                accounts={accounts}
                rows={rows}
                onChange={setRows}
                total={purchaseReturn.remaining_refundable}
                error={paymentRowsError(form.errors) ?? form.errors.payments}
            />
        </FormModal>
    );
}
