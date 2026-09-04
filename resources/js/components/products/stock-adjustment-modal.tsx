import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type ProductListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';

interface StockAdjustmentModalProps {
    product: ProductListItem | null;
    onOpenChange: (open: boolean) => void;
}

/**
 * Enter the actual counted quantity — the difference against current_stock
 * becomes one adjustment_increase/decrease movement (AdjustStockAction).
 */
export default function StockAdjustmentModal({ product, onOpenChange }: StockAdjustmentModalProps) {
    const form = useForm({
        quantity: 0,
        reason: '',
    });

    useEffect(() => {
        if (product) {
            form.clearErrors();
            form.setData({ quantity: product.current_stock, reason: '' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!product) {
            return;
        }

        form.post(route('stock-adjustments.store', product.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={product !== null}
            onOpenChange={onOpenChange}
            title={`Adjust Stock — ${product?.name ?? ''}`}
            description="প্রকৃত গণনা করা quantity লিখুন — বর্তমান stock-এর সাথে পার্থক্যটুকু adjustment হিসেবে যোগ হবে"
            submitLabel="Adjust"
            processing={form.processing}
            onSubmit={submit}
        >
            <div className="grid gap-2">
                <Label htmlFor="quantity">Actual Quantity {product && <span className="text-muted-foreground">({product.unit.name})</span>}</Label>
                <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={form.data.quantity}
                    onChange={(e) => form.setData('quantity', Number(e.target.value))}
                    required
                />
                {product && (
                    <p className="text-muted-foreground text-xs">
                        বর্তমান stock: {product.current_stock} {product.unit.name}
                    </p>
                )}
                <InputError message={form.errors.quantity} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                    id="reason"
                    placeholder="damaged, count mismatch..."
                    value={form.data.reason}
                    onChange={(e) => form.setData('reason', e.target.value)}
                />
                <InputError message={form.errors.reason} />
            </div>
        </FormModal>
    );
}
