import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { ToggleRow } from '@/components/form/toggle-row';
import { financedGoodsFor } from '@/components/sales/form/sale-form-utils';
import FormModal from '@/components/shared/form-modal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
    type EmiFrequencyValue,
    type EmiInterestMethodValue,
    type EmiPreview,
    type EmiTenureUnitValue,
    useEmiPreview,
} from '@/hooks/use-emi-preview';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { type SaleFormItem } from '@/types/models';
import { Landmark } from 'lucide-react';

import { FormEventHandler, useEffect, useState } from 'react';

const round2 = (value: number) => Math.round(value * 100) / 100;

export type FinancingTypeValue = 'one_time' | 'emi';

/** Everything the financing dialog edits; `installment_count` is derived from these on the server. */
export interface FinancingTerms {
    financing_type: FinancingTypeValue;
    emi_interest_method: EmiInterestMethodValue;
    emi_annual_rate: number;
    emi_tenure_value: number | null;
    emi_tenure_unit: EmiTenureUnitValue;
    emi_frequency: EmiFrequencyValue;
    /** Collect the installation charge together with the down payment (it is never financed either way). */
    emi_installation_upfront: boolean;
}

interface FinancingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial: FinancingTerms;
    /** The sale's current total and what the payment rows currently add up to (the dialog starts its down payment from this). */
    saleTotal: number;
    /** Installation charge inside `saleTotal`: never financed, never charged interest; stays a separate due. */
    installation: number;
    /** The cart lines: the cashier picks which of them go on EMI; the rest are paid now. */
    items: SaleFormItem[];
    productName: (productId: number) => string;
    /** The invoice discount, shared across the lines by price. */
    discountAmount: number;
    /** What the payment rows hold beyond the pay-now products: the dialog starts its down payment from this. */
    downPayment: number;
    saleDate: string;
    error?: string;
    /** `payNow` is what to put into the payment rows; `financedLines` says, per cart line, whether it is on EMI. */
    onApply: (terms: FinancingTerms, installmentCount: number | null, payNow: number, financedLines: boolean[]) => void;
}

const FINANCING_OPTIONS = [
    { value: 'one_time', label: 'One-time (pay in full)' },
    { value: 'emi', label: 'EMI (pay in installments)' },
];

const METHOD_OPTIONS = [
    { value: 'none', label: 'No interest' },
    { value: 'flat', label: 'Flat rate' },
    { value: 'reducing', label: 'Reducing balance' },
];

const UNIT_OPTIONS = [
    { value: 'days', label: 'Days' },
    { value: 'weeks', label: 'Weeks' },
    { value: 'months', label: 'Months' },
    { value: 'years', label: 'Years' },
];

const FREQUENCY_OPTIONS = [
    { value: 'weekly', label: 'Every week' },
    { value: 'monthly', label: 'Every month' },
    { value: 'quarterly', label: 'Every 3 months' },
];

const METHOD_HINT: Record<EmiInterestMethodValue, string> = {
    none: 'The amount after the down payment is split evenly.',
    flat: 'Interest is worked out once on the financed amount for the whole period, so every installment is the same.',
    reducing: 'Interest is charged only on what is still owed, so it is lower than a flat rate with the same percentage.',
};

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'danger' }) {
    return (
        <div className={cn('flex items-baseline justify-between gap-4 py-1.5', strong && 'border-brand-card-border mt-1 border-t pt-2.5')}>
            <dt className={cn('text-sm', strong ? 'font-semibold' : 'text-muted-foreground')}>{label}</dt>
            <dd
                className={cn(
                    'text-right tabular-nums',
                    strong ? 'text-base font-semibold' : 'text-sm font-medium',
                    tone === 'danger' && 'text-brand-danger-text',
                )}
            >
                {value}
            </dd>
        </div>
    );
}

/** The quote: price, down payment, interest, what each installment is, and the date-by-date list. */
function PreviewPanel({ preview }: { preview: EmiPreview }) {
    const money = useMoneyFormat();

    return (
        <div className="space-y-3">
            <dl className="border-brand-card-border bg-brand-secondary/40 rounded-brand-control divide-brand-card-border divide-y border px-3.5 py-1.5">
                <Row label="Price of the goods" value={money(preview.sale_total - preview.installation)} />
                {preview.cash_goods > 0 && <Row label="Paid now (not on EMI)" value={money(preview.cash_goods)} />}
                {preview.installation > 0 && <Row label="Installation (not financed)" value={money(preview.installation)} />}
                <Row label="Down payment on the EMI products" value={`− ${money(preview.down_payment)}`} />
                <Row label="Amount financed" value={money(preview.principal)} />
                <Row
                    label={`Interest (${preview.periods} installments)`}
                    value={`+ ${money(preview.interest_total)}`}
                    tone={preview.interest_total > 0 ? 'danger' : undefined}
                />
                <Row label="To pay in installments" value={money(preview.total_payable)} />
                <Row label="Total cost with interest" value={money(preview.grand_total)} strong />
            </dl>

            <div className="border-brand-primary/25 bg-brand-primary/[0.06] rounded-brand-control flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border px-3.5 py-3">
                <p className="text-sm">
                    <span className="text-muted-foreground">Each installment</span>{' '}
                    <span className="text-brand-primary-text text-lg font-semibold tabular-nums">{money(preview.installment_amount)}</span>{' '}
                    <span className="text-muted-foreground">× {preview.periods}</span>
                </p>
                <p className="text-sm">
                    <span className="text-muted-foreground">First due</span>{' '}
                    <span className="font-semibold">{formatDate(preview.first_due_date)}</span>
                </p>
            </div>

            {preview.tenure_adjusted && (
                <Alert variant="info">
                    <AlertDescription>
                        The duration doesn&apos;t divide evenly, so it was rounded up to {preview.periods} installments.
                    </AlertDescription>
                </Alert>
            )}

            <div className="rounded-brand-control border-brand-control-border max-h-64 overflow-auto border">
                <table className="w-full min-w-[30rem] border-separate border-spacing-0 text-sm">
                    <thead className="bg-brand-table-header text-muted-foreground sticky top-0 text-xs font-semibold">
                        <tr>
                            <th scope="col" className="border-brand-table-divider w-10 border-b px-3 py-2 text-left">
                                #
                            </th>
                            <th scope="col" className="border-brand-table-divider border-b px-3 py-2 text-left">
                                Due date
                            </th>
                            <th scope="col" className="border-brand-table-divider border-b px-3 py-2 text-right">
                                Principal
                            </th>
                            <th scope="col" className="border-brand-table-divider border-b px-3 py-2 text-right">
                                Interest
                            </th>
                            <th scope="col" className="border-brand-table-divider border-b px-3 py-2 text-right">
                                Installment
                            </th>
                        </tr>
                    </thead>
                    <tbody className="[&>tr:last-child>td]:border-b-0">
                        {preview.schedule.map((row) => (
                            <tr key={row.number}>
                                <td className="border-brand-table-divider text-muted-foreground border-b px-3 py-2 tabular-nums">{row.number}</td>
                                <td className="border-brand-table-divider border-b px-3 py-2 whitespace-nowrap">{formatDate(row.due_date)}</td>
                                <td className="border-brand-table-divider border-b px-3 py-2 text-right tabular-nums">{money(row.principal)}</td>
                                <td className="border-brand-table-divider text-muted-foreground border-b px-3 py-2 text-right tabular-nums">
                                    {money(row.interest)}
                                </td>
                                <td className="border-brand-table-divider border-b px-3 py-2 text-right font-medium tabular-nums">
                                    {money(row.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * Choose how the customer pays: in full, or in installments with an interest method, a rate, a duration and how
 * often they pay. The panel under the fields is a live quote from the server's calculator (the same maths the
 * sale uses when it is confirmed), built from the sale's total and the down payment entered in the payment rows.
 */
export default function FinancingModal({
    open,
    onOpenChange,
    initial,
    saleTotal,
    installation,
    items,
    productName,
    discountAmount,
    downPayment,
    saleDate,
    error,
    onApply,
}: FinancingModalProps) {
    const formatMoney = useMoneyFormat();

    const [terms, setTerms] = useState<FinancingTerms>(initial);
    // Which lines are on EMI; the rest of the invoice is paid now and never financed.
    const [financedLines, setFinancedLines] = useState<boolean[]>([]);
    const financedCount = financedLines.filter(Boolean).length;
    const goodsAfterDiscount = round2(saleTotal - installation);
    const financedGoods = financedGoodsFor(items, discountAmount, (_item, index) => financedLines[index] ?? true);
    const cashGoods = round2(goodsAfterDiscount - financedGoods);
    // The down payment and the % are measured against the EMI products only.
    const goodsTotal = financedGoods;
    const [down, setDown] = useState(0);
    const [percentText, setPercentText] = useState('');
    const [triedToApply, setTriedToApply] = useState(false);

    // Re-seed each time the modal opens, matching DiscountModal's pattern.
    useEffect(() => {
        if (open) {
            setTerms(initial);
            setFinancedLines(items.map((item) => item.emi_financed !== false));
            setTriedToApply(false);

            // The payment rows start out holding the FULL price (everything paid now). That is not a down payment,
            // so begin from 0 unless a smaller amount has already been entered.
            const start = downPayment > 0 && downPayment < goodsTotal ? downPayment : 0;
            setDown(start);
            setPercentText(start > 0 && goodsTotal > 0 ? String(round2((start / goodsTotal) * 100)) : '');
        }
        // `initial` is a fresh object every render of the parent; only the open transition should reset the fields.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const set = <K extends keyof FinancingTerms>(key: K, value: FinancingTerms[K]) => setTerms((current) => ({ ...current, [key]: value }));
    const isEmi = terms.financing_type === 'emi';

    const {
        preview,
        loading,
        error: previewError,
    } = useEmiPreview(
        open && isEmi
            ? {
                  saleTotal,
                  installation,
                  financedGoods,
                  downPayment: down,
                  method: terms.emi_interest_method,
                  annualRate: terms.emi_annual_rate,
                  tenureValue: terms.emi_tenure_value,
                  tenureUnit: terms.emi_tenure_unit,
                  frequency: terms.emi_frequency,
                  saleDate,
              }
            : null,
    );

    const changeDownAmount = (amount: number) => {
        setDown(amount);
        setPercentText(amount > 0 && goodsTotal > 0 ? String(round2((amount / goodsTotal) * 100)) : '');
    };

    const changeDownPercent = (text: string) => {
        setPercentText(text);
        setDown(text === '' || goodsTotal <= 0 ? 0 : round2((goodsTotal * Number(text)) / 100));
    };

    // Why Apply can't go through yet — worked out from the fields alone, so it never depends on the quote having
    // finished loading (the quote is only a preview; the sale recalculates everything when it is saved).
    const blockReason = !isEmi
        ? null
        : saleTotal <= 0
          ? 'Add products to the sale first.'
          : financedCount === 0
            ? 'Choose at least one product to put on EMI.'
            : !terms.emi_tenure_value
              ? 'Enter the duration.'
              : terms.emi_interest_method !== 'none' && !(terms.emi_annual_rate > 0)
                ? 'Enter an interest rate above 0, or choose "No interest".'
                : down >= goodsTotal
                  ? 'The down payment must be less than the price of the EMI products.'
                  : previewError;

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        if (blockReason) {
            setTriedToApply(true);

            return;
        }

        onApply(
            terms,
            isEmi ? (preview?.periods ?? null) : null,
            isEmi ? round2(down + cashGoods + (terms.emi_installation_upfront ? installation : 0)) : downPayment,
            financedLines,
        );
        onOpenChange(false);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Payment plan"
            description="Pay in full, or split the rest into installments."
            icon={<Landmark />}
            submitLabel="Apply"
            size="xl"
            onSubmit={submit}
        >
            <FormSelect
                id="financing_modal_type"
                label="How will the customer pay?"
                value={terms.financing_type}
                onChange={(value) => value && set('financing_type', value as FinancingTypeValue)}
                options={FINANCING_OPTIONS}
            />

            {isEmi && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormSelect
                            id="financing_modal_method"
                            label="Interest type"
                            value={terms.emi_interest_method}
                            onChange={(value) => value && set('emi_interest_method', value as EmiInterestMethodValue)}
                            options={METHOD_OPTIONS}
                            helperText={METHOD_HINT[terms.emi_interest_method]}
                        />

                        {terms.emi_interest_method !== 'none' && (
                            <FormInput
                                id="financing_modal_rate"
                                label="Interest rate (% per year)"
                                type="number"
                                min={0}
                                step="0.01"
                                value={terms.emi_annual_rate || ''}
                                onChange={(event) => set('emi_annual_rate', event.target.value === '' ? 0 : Number(event.target.value))}
                                placeholder="e.g. 12"
                            />
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <FormInput
                            id="financing_modal_tenure"
                            label="Duration"
                            type="number"
                            min={1}
                            value={terms.emi_tenure_value ?? ''}
                            onChange={(event) => set('emi_tenure_value', event.target.value === '' ? null : Number(event.target.value))}
                            placeholder="e.g. 12"
                            required
                        />
                        <FormSelect
                            id="financing_modal_unit"
                            label="Duration type"
                            value={terms.emi_tenure_unit}
                            onChange={(value) => value && set('emi_tenure_unit', value as EmiTenureUnitValue)}
                            options={UNIT_OPTIONS}
                        />
                        <FormSelect
                            id="financing_modal_frequency"
                            label="Pay"
                            value={terms.emi_frequency}
                            onChange={(value) => value && set('emi_frequency', value as EmiFrequencyValue)}
                            options={FREQUENCY_OPTIONS}
                        />
                    </div>

                    {items.length > 1 && (
                        <fieldset className="border-brand-card-border rounded-brand-control space-y-1 border px-3.5 py-3">
                            <legend className="px-1 text-sm font-medium">Which products go on EMI?</legend>
                            <p className="text-muted-foreground text-xs leading-4">
                                The rest are paid now, together with this invoice, and carry no interest.
                            </p>
                            <ul className="divide-brand-card-border divide-y">
                                {items.map((item, index) => (
                                    <li key={`${item.product_id}-${index}`} className="py-1.5">
                                        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                                            <span className="flex min-w-0 items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    className="accent-brand-primary size-4"
                                                    checked={financedLines[index] ?? true}
                                                    onChange={(event) =>
                                                        setFinancedLines((lines) =>
                                                            items.map((_, i) => (i === index ? event.target.checked : (lines[i] ?? true))),
                                                        )
                                                    }
                                                />
                                                <span className="truncate">{productName(item.product_id)}</span>
                                            </span>
                                            <span className="text-muted-foreground tabular-nums">
                                                {formatMoney(round2(item.quantity * item.unit_price))}
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-muted-foreground pt-1 text-xs">
                                On EMI: <span className="text-foreground font-medium tabular-nums">{formatMoney(financedGoods)}</span> · Paid now:{' '}
                                <span className="text-foreground font-medium tabular-nums">{formatMoney(cashGoods)}</span>
                            </p>
                        </fieldset>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormInput
                            id="financing_modal_down"
                            label="Down payment on the EMI products (paid now)"
                            type="number"
                            min={0}
                            step="0.01"
                            value={down || ''}
                            onChange={(event) => changeDownAmount(event.target.value === '' ? 0 : Number(event.target.value))}
                            placeholder="0"
                            helperText="Goes into the sale's payment amount when you apply."
                        />
                        <FormInput
                            id="financing_modal_down_percent"
                            label="or % of the EMI products' price"
                            type="number"
                            min={0}
                            max={99.99}
                            step="0.01"
                            value={percentText}
                            onChange={(event) => changeDownPercent(event.target.value)}
                            placeholder="e.g. 20"
                        />
                    </div>

                    {installation > 0 && (
                        <div className="space-y-2">
                            <ToggleRow
                                id="financing_modal_installation_upfront"
                                label={`Collect the installation charge now (${formatMoney(installation)})`}
                                description={
                                    terms.emi_installation_upfront
                                        ? `The payment amount becomes ${formatMoney(round2(down + installation))}: ${formatMoney(down)} down payment + ${formatMoney(installation)} installation.`
                                        : 'Off: the payment amount is only the down payment, and the installation stays a separate due (collect it later with Add Payment).'
                                }
                                checked={terms.emi_installation_upfront}
                                onCheckedChange={(checked) => set('emi_installation_upfront', checked)}
                            />
                            <p className="text-muted-foreground text-xs leading-4">
                                Either way the installation is not financed and carries no interest.
                            </p>
                        </div>
                    )}

                    {saleTotal <= 0 && (
                        <Alert variant="neutral">
                            <AlertDescription>Add products to the sale first, then the installments can be worked out.</AlertDescription>
                        </Alert>
                    )}

                    {triedToApply && blockReason && blockReason !== previewError && (
                        <Alert variant="destructive">
                            <AlertDescription>{blockReason}</AlertDescription>
                        </Alert>
                    )}

                    {(previewError ?? error) && (
                        <Alert variant="destructive">
                            <AlertDescription>{previewError ?? error}</AlertDescription>
                        </Alert>
                    )}

                    {saleTotal > 0 && !terms.emi_tenure_value && !previewError && (
                        <Alert variant="neutral">
                            <AlertDescription>Enter a duration to see the installments.</AlertDescription>
                        </Alert>
                    )}

                    {loading && !preview && (
                        <div className="space-y-2" aria-hidden="true">
                            <Skeleton className="h-28 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    )}

                    {preview && !previewError && (
                        <div className={cn('motion-opacity', loading && 'opacity-60')} aria-busy={loading}>
                            <PreviewPanel preview={preview} />
                        </div>
                    )}
                </>
            )}
        </FormModal>
    );
}
