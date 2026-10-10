import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type PurchaseDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { Coins } from 'lucide-react';
import { type FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface AdjustCostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: PurchaseDetail;
}

/**
 * Correct only the price of a received purchase. Quantities, stock and serial numbers are not touched, so this works
 * even when some of the goods are already sold; only what is owed, the inventory value and the cost move.
 */
export default function AdjustCostModal({ open, onOpenChange, purchase }: AdjustCostModalProps) {
    const money = useMoneyFormat();

    const form = useForm({
        reason: '',
        items: purchase.items.map((item) => ({ id: item.id, unit_price: item.unit_price })),
    });

    // Start from the saved prices every time the dialog opens.
    useEffect(() => {
        if (open) {
            form.setData({ reason: '', items: purchase.items.map((item) => ({ id: item.id, unit_price: item.unit_price })) });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
    }, [open]);

    const setPrice = (index: number, unitPrice: number) =>
        form.setData(
            'items',
            form.data.items.map((row, i) => (i === index ? { ...row, unit_price: unitPrice } : row)),
        );

    const subtotal = form.data.items.reduce((sum, row, index) => sum + row.unit_price * purchase.items[index].quantity, 0);
    const discount =
        purchase.discount_type === 'percentage'
            ? (subtotal * (purchase.discount_value ?? 0)) / 100
            : Math.min(purchase.discount_value ?? 0, subtotal);
    const newTotal = Math.round((subtotal - (purchase.discount_type ? discount : 0)) * 100) / 100;
    const difference = Math.round((newTotal - purchase.total_amount) * 100) / 100;

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.patch(route('purchases.cost.update', purchase.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Purchase cost corrected.');
                onOpenChange(false);
            },
            onError: (errors) => toast.error(errors.items ?? errors.purchase ?? errors.reason ?? 'Could not correct the cost.'),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Correct the price"
            description="Only the price changes. Quantity, stock and serial numbers stay as they are."
            submitLabel="Save price"
            processing={form.processing}
            onSubmit={submit}
            icon={<Coins />}
            size="lg"
            footerStart={
                <span className="text-muted-foreground text-xs tabular-nums">
                    {money(purchase.total_amount)} → <b className="text-foreground">{money(newTotal)}</b> ({difference > 0 ? '+' : ''}
                    {money(difference)})
                </span>
            }
        >
            <div className="space-y-3">
                <div className="divide-brand-table-divider divide-y text-sm">
                    {purchase.items.map((item, index) => (
                        <div key={item.id} className="grid items-center gap-2 py-2 sm:grid-cols-[1fr_6rem_9rem]">
                            <div className="min-w-0">
                                <p className="truncate font-medium">{item.product.name}</p>
                                <p className="text-muted-foreground text-xs">Was {money(item.unit_price)} each</p>
                            </div>
                            <p className="text-muted-foreground tabular-nums sm:text-right">× {item.quantity}</p>
                            <MoneyInput
                                aria-label={`New price of ${item.product.name}`}
                                value={form.data.items[index]?.unit_price ?? 0}
                                onChange={(event) => setPrice(index, Number(event.target.value))}
                            />
                        </div>
                    ))}
                </div>
                <InputError message={form.errors.items} />

                <div className="space-y-1.5">
                    <Label htmlFor="cost_reason" required>
                        Reason for the change
                    </Label>
                    <Input
                        id="cost_reason"
                        value={form.data.reason}
                        onChange={(event) => form.setData('reason', event.target.value)}
                        placeholder="e.g. supplier's real price was different"
                        maxLength={255}
                        aria-invalid={form.errors.reason ? true : undefined}
                    />
                    <InputError message={form.errors.reason} />
                </div>
            </div>
        </FormModal>
    );
}
