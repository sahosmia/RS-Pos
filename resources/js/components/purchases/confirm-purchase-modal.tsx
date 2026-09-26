import { FormInput } from '@/components/form/form-input';
import AccountPaymentRows, { type PaymentRow } from '@/components/shared/account-payment-rows';
import FormModal from '@/components/shared/form-modal';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type PurchaseDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

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

    const serialTrackedItems = purchase.items.filter((item) => item.product.track_serial_number);

    const form = useForm({
        payments: [] as PaymentRow[],
        credit_applied: 0,
        serial_numbers: Object.fromEntries(serialTrackedItems.map((item) => [item.id, Array(item.quantity).fill('')])) as Record<
            number,
            string[]
        >,
    });

    const setSerial = (itemId: number, unitIndex: number, value: string) => {
        const next = { ...form.data.serial_numbers, [itemId]: [...form.data.serial_numbers[itemId]] };
        next[itemId][unitIndex] = value;
        form.setData('serial_numbers', next);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({ ...data, payments: rows.filter((row) => row.account_id && row.amount > 0) }));

        form.post(route('purchases.confirm', purchase.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Purchase confirmed as received.');
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
                    <FormInput
                        id="credit_applied"
                        label={`Apply Supplier Credit (available: ${money(supplierCredit)})`}
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

            {serialTrackedItems.length > 0 && (
                <div className="space-y-3">
                    {serialTrackedItems.map((item) => (
                        <div key={item.id} className="grid gap-2">
                            <Label>
                                {item.product.name} — {item.quantity}টা unit-এর serial number
                            </Label>
                            {form.data.serial_numbers[item.id].map((serial, unitIndex) => (
                                <FormInput
                                    key={unitIndex}
                                    id={`serial-${item.id}-${unitIndex}`}
                                    value={serial}
                                    onChange={(e) => setSerial(item.id, unitIndex, e.target.value)}
                                    placeholder={`Unit ${unitIndex + 1}`}
                                    required
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            <AccountPaymentRows accounts={accounts} rows={rows} onChange={setRows} total={purchase.total_amount - form.data.credit_applied} />
        </FormModal>
    );
}
