import InputError from '@/components/input-error';
import { type SaleFormApi } from '@/components/sales/form/sale-form-utils';
import { Button } from '@/components/ui/button';
import { type EmiPreview } from '@/hooks/use-emi-preview';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDate } from '@/lib/format-date';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';

interface OrderSummaryProps {
    form: SaleFormApi;
    subtotal: number;
    discountAmount: number;
    installation: number;
    total: number;
    /** Live installment quote while the sale is on EMI; adds the interest, installment and first due date lines. */
    emiPreview?: EmiPreview | null;
    /** Shown under the financing row when the installments can't be worked out, so the EMI lines never vanish silently. */
    emiError?: string | null;
    onEditFinancing: () => void;
    onEditDiscount: () => void;
}

/** Subtotal, discount, financing (when the EMI module is on) and the big grand total — no box of its own. */
export function OrderSummary({
    form,
    subtotal,
    discountAmount,
    installation,
    total,
    emiPreview = null,
    emiError = null,
    onEditFinancing,
    onEditDiscount,
}: OrderSummaryProps) {
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
                    <span className="text-right tabular-nums">
                        {form.data.financing_type === 'emi'
                            ? `EMI${form.data.installment_count ? ` (${form.data.installment_count}x)` : ''}${form.data.emi_interest_method !== 'none' ? ` · ${form.data.emi_interest_method === 'flat' ? 'Flat' : 'Reducing'} ${form.data.emi_annual_rate}%` : ''}`
                            : 'One-time'}
                    </span>
                </div>
            )}

            {emiError && (
                <p className="text-brand-danger-text text-xs leading-4" role="alert">
                    {emiError}
                </p>
            )}

            {emiPreview && !emiError && (
                <div className="space-y-1.5 pt-1">
                    {emiPreview.interest_total > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Interest</span>
                            <span className="text-brand-danger-text tabular-nums">+{money(emiPreview.interest_total)}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Installment</span>
                        <span className="tabular-nums">
                            {emiPreview.periods} × {money(emiPreview.installment_amount)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">First due</span>
                        <span className="tabular-nums">{formatDate(emiPreview.first_due_date)}</span>
                    </div>
                </div>
            )}

            <div className="flex items-baseline justify-between pt-2">
                <span className="font-semibold">{emiPreview && !emiError && emiPreview.interest_total > 0 ? 'Total with interest' : 'Total'}</span>
                <span className="text-2xl font-bold tabular-nums">{money(emiPreview && !emiError ? emiPreview.grand_total : total)}</span>
            </div>

            {form.errors.installment_count && <InputError message={form.errors.installment_count} />}
        </div>
    );
}
