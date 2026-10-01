import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { FormEventHandler, useEffect, useState } from 'react';

export type DiscountTypeValue = 'flat' | 'percentage' | null;

interface DiscountModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The pre-discount amount the preview and the Percentage/Fixed math are computed against. */
    baseAmount: number;
    initialType: DiscountTypeValue;
    initialValue: number;
    onApply: (type: DiscountTypeValue, value: number) => void;
    title?: string;
}

const discountTypeOptions = [
    { value: 'percentage', label: 'Percentage' },
    { value: 'flat', label: 'Fixed Amount' },
];

/**
 * The flat/percentage discount math, mirrored client-side from
 * `SaleTotals::applyDiscount` purely for this live preview — the server
 * always recomputes the authoritative amount from `type`/`value` itself.
 */
export function discountAmountFor(base: number, type: DiscountTypeValue, value: number): number {
    if (type === 'flat') {
        return Math.min(value, base);
    }

    if (type === 'percentage') {
        return (base * value) / 100;
    }

    return 0;
}

/**
 * Shared None / Percentage / Fixed Amount discount picker — used both for a
 * single sale item's discount and for the invoice-level discount, against
 * whatever `baseAmount` the caller passes (a product's price, or the sale's
 * post-item-discount subtotal).
 */
export default function DiscountModal({
    open,
    onOpenChange,
    baseAmount,
    initialType,
    initialValue,
    onApply,
    title = 'Discount',
}: DiscountModalProps) {
    const money = useMoneyFormat();
    const [type, setType] = useState<DiscountTypeValue>(initialType);
    const [value, setValue] = useState(initialValue);

    // Re-seed from the current item/invoice each time the modal opens, since
    // the same instance is reused across different rows via `key`-less state.
    useEffect(() => {
        if (open) {
            setType(initialType);
            setValue(initialValue);
        }
    }, [open, initialType, initialValue]);

    const discountAmount = discountAmountFor(baseAmount, type, value);
    const finalAmount = baseAmount - discountAmount;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        onApply(type, type ? value : 0);
        onOpenChange(false);
    };

    return (
        <FormModal open={open} onOpenChange={onOpenChange} title={title} submitLabel="Apply" onSubmit={submit}>
            <FormSelect
                id="discount_modal_type"
                label="Discount Type"
                value={type}
                onChange={(val) => setType(val as DiscountTypeValue)}
                options={discountTypeOptions}
                allowNone
                noneLabel="None"
            />

            {type === 'percentage' && (
                <FormInput
                    id="discount_modal_value"
                    label="Percentage"
                    type="number"
                    step="0.01"
                    min={0}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    placeholder="0.00"
                />
            )}

            {type === 'flat' && (
                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="discount_modal_value">Amount</Label>
                    <MoneyInput id="discount_modal_value" value={value} onChange={(e) => setValue(Number(e.target.value))} />
                </div>
            )}

            {type && (
                <div className="grid gap-1 rounded-lg border p-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Original</span>
                        <span className="tabular-nums">{money(baseAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">You save</span>
                        <span className="tabular-nums">-{money(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                        <span>New amount</span>
                        <span className="tabular-nums">{money(finalAmount)}</span>
                    </div>
                </div>
            )}
        </FormModal>
    );
}
