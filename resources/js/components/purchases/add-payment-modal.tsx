import PaymentRows, { type PaymentRow } from '@/components/purchases/payment-rows';
import FormModal from '@/components/shared/form-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type PurchaseDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface AddPaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: PurchaseDetail;
    accounts: Account[];
}

export default function AddPaymentModal({ open, onOpenChange, purchase, accounts }: AddPaymentModalProps) {
    const money = useMoneyFormat();
    const [rows, setRows] = useState<PaymentRow[]>([]);

    const supplierCredit = Math.max(purchase.supplier.balance, 0);
    const suggestedCredit = Math.min(supplierCredit, purchase.due_amount);

    const form = useForm({
        payments: [] as PaymentRow[],
        credit_applied: 0,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({ ...data, payments: rows.filter((row) => row.account_id && row.amount > 0) }));

        form.post(route('purchases.payments.store', purchase.id), {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                setRows([]);
                form.setData('credit_applied', 0);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Add Payment"
            description={`${purchase.invoice_no} — বকেয়া: ${money(purchase.due_amount)}`}
            submitLabel="Record Payment"
            processing={form.processing}
            onSubmit={submit}
        >
            {supplierCredit > 0 && (
                <div className="grid gap-2">
                    <Label htmlFor="credit_applied">Apply Supplier Credit (available: {money(supplierCredit)})</Label>
                    <Input
                        id="credit_applied"
                        type="number"
                        step="0.01"
                        min={0}
                        max={suggestedCredit}
                        value={form.data.credit_applied}
                        onChange={(e) => form.setData('credit_applied', Number(e.target.value))}
                    />
                </div>
            )}

            <PaymentRows accounts={accounts} rows={rows} onChange={setRows} />
        </FormModal>
    );
}
