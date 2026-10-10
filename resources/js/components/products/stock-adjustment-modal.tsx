import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { type ProductListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface StockAdjustmentModalProps {
    product: ProductListItem | null;
    onOpenChange: (open: boolean) => void;
}

/**
 * A normal product: enter the actual counted quantity — the difference against current_stock becomes one adjustment
 * movement (AdjustStockAction). A serial-tracked product has no typed count: tick the units that are gone, and type the
 * serials of units that were found (AdjustSerialStockAction), so the serial list and the stock always stay equal.
 */
export default function StockAdjustmentModal({ product, onOpenChange }: StockAdjustmentModalProps) {
    const { t, locale } = useTranslation();
    const bn = locale === 'bn';
    const tracksSerials = product?.track_serial_number === true;
    const needsCost = product ? product.avg_cost <= 0 : false;
    const [inStock, setInStock] = useState<string[]>([]);
    const [loadingSerials, setLoadingSerials] = useState(false);
    const [found, setFound] = useState('');

    const form = useForm({
        quantity: 0,
        unit_cost: 0,
        reason: '',
        remove_serials: [] as string[],
        add_serials: [] as string[],
    });

    useEffect(() => {
        if (product) {
            form.clearErrors();
            form.setData({
                quantity: product.current_stock,
                unit_cost: product.avg_cost > 0 ? product.avg_cost : 0,
                reason: '',
                remove_serials: [],
                add_serials: [],
            });
            setFound('');
            setInStock([]);

            if (product.track_serial_number) {
                setLoadingSerials(true);
                fetch(route('products.in-stock-serials', product.id), { headers: { Accept: 'application/json' } })
                    .then((response) => (response.ok ? response.json() : { serials: [] }))
                    .then((body) => setInStock(body.serials ?? []))
                    .catch(() => setInStock([]))
                    .finally(() => setLoadingSerials(false));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id]);

    const foundSerials = found
        .split(/[\n,]+/)
        .map((serial) => serial.trim())
        .filter(Boolean);

    const toggleGone = (serial: string, gone: boolean) =>
        form.setData('remove_serials', gone ? [...form.data.remove_serials, serial] : form.data.remove_serials.filter((value) => value !== serial));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!product) {
            return;
        }

        if (tracksSerials) {
            form.transform((data) => ({
                reason: data.reason,
                unit_cost: data.unit_cost || null,
                remove_serials: data.remove_serials,
                add_serials: foundSerials,
            }));
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
            {tracksSerials ? (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{bn ? 'যে unit গুলো নেই (হারিয়েছে / নষ্ট)' : 'Units that are gone (lost / damaged)'}</Label>
                        <p className="text-muted-foreground text-xs">
                            {bn
                                ? 'In-stock serial থেকে বেছে নিন। বাছাই করা unit Written off হবে, stock সেই সংখ্যায় কমবে।'
                                : 'Tick them from the in-stock serials. They become Written off and stock drops by that many.'}
                            {product && ` (${t('stockAdjustment', 'current_stock')}: ${product.current_stock}, in-stock serials: ${inStock.length})`}
                        </p>
                        <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
                            {loadingSerials && <p className="text-muted-foreground text-xs">…</p>}
                            {!loadingSerials && inStock.length === 0 && (
                                <p className="text-muted-foreground text-xs">{bn ? 'কোনো in-stock serial নেই' : 'No in-stock serials'}</p>
                            )}
                            {inStock.map((serial) => (
                                <label key={serial} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={form.data.remove_serials.includes(serial)}
                                        onCheckedChange={(checked) => toggleGone(serial, checked === true)}
                                    />
                                    <span className="font-mono">{serial}</span>
                                </label>
                            ))}
                        </div>
                        <InputError message={form.errors.remove_serials} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="add_serials">{bn ? 'যে unit পাওয়া গেছে (নতুন serial)' : 'Units that were found (new serials)'}</Label>
                        <Textarea
                            id="add_serials"
                            rows={3}
                            placeholder={bn ? 'প্রতি লাইনে একটা serial' : 'One serial per line'}
                            value={found}
                            onChange={(e) => setFound(e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">
                            {bn
                                ? 'এগুলো In stock হয়ে ঢুকবে, stock সেই সংখ্যায় বাড়বে।'
                                : 'They enter stock as In stock and stock goes up by that many.'}
                        </p>
                        <InputError message={form.errors.add_serials} />
                    </div>
                </div>
            ) : (
                <div className="grid min-w-0 content-start gap-2">
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
            )}

            {needsCost && (
                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="unit_cost" required={!tracksSerials}>
                        {t('stockAdjustment', 'unit_cost')}
                    </Label>
                    <MoneyInput id="unit_cost" value={form.data.unit_cost} onChange={(e) => form.setData('unit_cost', Number(e.target.value))} />
                    <p className="text-muted-foreground text-xs">{t('stockAdjustment', 'unit_cost_hint')}</p>
                    <InputError message={form.errors.unit_cost} />
                </div>
            )}

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="reason" required>
                    {t('stockAdjustment', 'reason')}
                </Label>
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
