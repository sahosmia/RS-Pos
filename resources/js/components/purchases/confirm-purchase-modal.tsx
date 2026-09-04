import AccountPaymentRows, { type PaymentRow } from '@/components/shared/account-payment-rows';
import FormModal from '@/components/shared/form-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type PurchaseDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface ConfirmPurchaseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: PurchaseDetail;
    accounts: Account[];
}

/** "Status Update" — Draft/Ordered → Received. Stock and the supplier's ledger move here. */
export default function ConfirmPurchaseModal({ open, onOpenChange, purchase, accounts }: ConfirmPurchaseModalProps) {
    const money = useMoneyFormat();
    const [rows, setRows] = useState<PaymentRow[]>([]);

    const supplierCredit = Math.max(purchase.supplier.balance, 0);
    const suggestedCredit = Math.min(supplierCredit, purchase.total_amount);

    const form = useForm({
        payments: [] as PaymentRow[],
        credit_applied: 0,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({ ...data, payments: rows.filter((row) => row.account_id && row.amount > 0) }));

        form.post(route('purchases.confirm', purchase.id), {
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
            title="Confirm Receipt"
            description={`${purchase.invoice_no} — Received হলে stock বাড়বে ও avg_cost recalculate হবে, আর ফেরানো যাবে না`}
            submitLabel="Mark as Received"
            processing={form.processing}
            onSubmit={submit}
        >
            <p className="text-sm">
                Total: <span className="font-medium">{money(purchase.total_amount)}</span>
            </p>

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
                    <p className="text-muted-foreground text-xs">নতুন cash payment ছাড়াই আগের credit থেকে বকেয়া কমাতে পারেন</p>
                </div>
            )}

            <AccountPaymentRows accounts={accounts} rows={rows} onChange={setRows} />
        </FormModal>
    );
}
