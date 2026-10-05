import InputError from '@/components/input-error';
import { type SaleFormApi } from '@/components/sales/form/sale-form-utils';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';

interface OrderSummaryProps {
    form: SaleFormApi;
    subtotal: number;
    discountAmount: number;
    installation: number;
    total: number;
    onEditFinancing: () => void;
    onEditDiscount: () => void;
}

/** Subtotal, discount, financing (when the EMI module is on) and the big grand total — no box of its own. */
export function OrderSummary({ form, subtotal, discountAmount, installation, total, onEditFinancing, onEditDiscount }: OrderSummaryProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();

    return (
        <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{money(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                    Discount
                    <Button type="button" variant="ghost" size="icon" className="size-5" onClick={onEditDiscount} aria-label="Edit discount">
                        <Pencil className="size-3" />
                    </Button>
                </span>
                <span className={discountAmount > 0 ? 'text-rose-600 tabular-nums dark:text-rose-400' : 'tabular-nums'}>
                    {discountAmount > 0 ? `-${money(discountAmount)}` : money(0)}
                </span>
            </div>

            {installation > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Installation</span>
                    <span className="tabular-nums">+{money(installation)}</span>
                </div>
            )}

            {shop.emi_module_enabled && (
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                        Financing
                        <Button type="button" variant="ghost" size="icon" className="size-5" onClick={onEditFinancing} aria-label="Edit financing">
                            <Pencil className="size-3" />
                        </Button>
                    </span>
                    <span className="tabular-nums">
                        {form.data.financing_type === 'emi'
                            ? `EMI${form.data.installment_count ? ` (${form.data.installment_count}x)` : ''}`
                            : 'One-time'}
                    </span>
                </div>
            )}

            <div className="flex items-baseline justify-between pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold tabular-nums">{money(total)}</span>
            </div>

            {form.errors.installment_count && <InputError message={form.errors.installment_count} />}
        </div>
    );
}
