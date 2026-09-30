import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { type ProductListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface StockAdjustmentModalProps {
    product: ProductListItem | null;
    onOpenChange: (open: boolean) => void;
}

/**
 * Enter the actual counted quantity — the difference against current_stock
 * becomes one adjustment_increase/decrease movement (AdjustStockAction).
 */
export default function StockAdjustmentModal({ product, onOpenChange }: StockAdjustmentModalProps) {
    const { t } = useTranslation();
    const needsCost = product ? product.avg_cost <= 0 : false;

    const form = useForm({
        quantity: 0,
        unit_cost: 0,
        reason: '',
    });

    useEffect(() => {
        if (product) {
            form.clearErrors();
            form.setData({
                quantity: product.current_stock,
                unit_cost: product.avg_cost > 0 ? product.avg_cost : 0,
                reason: '',
            });
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
            onSuccess: () => {
                toast.success(t('stockAdjustment', 'toast'));
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={product !== null}
            onOpenChange={onOpenChange}
            title={`${t('stockAdjustment', 'title')} — ${product?.name ?? ''}`}
            description={t('stockAdjustment', 'description')}
            submitLabel={t('stockAdjustment', 'adjust')}
            processing={form.processing}
            onSubmit={submit}
        >
            <div className="grid gap-2">
                <FormInput
                    id="quantity"
                    label={
                        <>
                            {t('stockAdjustment', 'actual_quantity')}{' '}
                            {product && <span className="text-muted-foreground">({product.unit.name})</span>}
                        </>
                    }
                    type="number"
                    step="1"
                    value={form.data.quantity}
                    onChange={(e) => form.setData('quantity', Number(e.target.value))}
                    error={form.errors.quantity}
                    placeholder="0"
                    required
                />
                {product && (
                    <p className="text-muted-foreground text-xs">
                        {t('stockAdjustment', 'current_stock')}: {product.current_stock} {product.unit.name}
                    </p>
                )}
            </div>

            {needsCost && (
                <div className="grid gap-2">
                    <Label htmlFor="unit_cost" required>
                        {t('stockAdjustment', 'unit_cost')}
                    </Label>
                    <MoneyInput
                        id="unit_cost"
                        value={form.data.unit_cost}
                        onChange={(e) => form.setData('unit_cost', Number(e.target.value))}
                    />
                    <p className="text-muted-foreground text-xs">{t('stockAdjustment', 'unit_cost_hint')}</p>
                    <InputError message={form.errors.unit_cost} />
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor="reason">{t('stockAdjustment', 'reason')}</Label>
                <Textarea
                    id="reason"
                    placeholder={t('stockAdjustment', 'reason_placeholder')}
                    value={form.data.reason}
                    onChange={(e) => form.setData('reason', e.target.value)}
                />
                <InputError message={form.errors.reason} />
            </div>
        </FormModal>
    );
}
