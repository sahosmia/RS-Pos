import { useMoneyFormat } from '@/hooks/use-money-format';

interface ItemDiscountDetailProps {
    type: 'flat' | 'percentage' | null;
    value: number | null | undefined;
    /** Price per unit before the discount. */
    originalPrice: number | null | undefined;
    /** Price per unit after the discount. */
    unitPrice: number;
    quantity: number;
}

/** The Discount column of a cart table: what was given (% or amount), what it saves on the line and the price after it. */
export function ItemDiscountDetail({ type, value, originalPrice, unitPrice, quantity }: ItemDiscountDetailProps) {
    const money = useMoneyFormat();

    if (!type) {
        return <span className="text-muted-foreground text-xs">—</span>;
    }

    const saving = Math.max(0, ((originalPrice ?? unitPrice) - unitPrice) * quantity);

    return (
        <div className="text-right">
            <div className="text-brand-success-text text-xs font-medium tabular-nums">
                {type === 'percentage' ? `${value ?? 0}% off` : `${money(value ?? 0)} off`}
            </div>
            <div className="text-muted-foreground text-[11px] tabular-nums">
                {saving > 0 && <>Saves {money(saving)} · </>}
                {money(unitPrice)} each
            </div>
        </div>
    );
}
