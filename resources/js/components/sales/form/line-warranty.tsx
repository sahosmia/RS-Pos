import { type ProductOption } from '@/components/shared/product-search-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface LineWarrantyProps {
    product: ProductOption | undefined;
    /** Months of warranty on this line; 0 = none. Starts as the product's own warranty. */
    months: number;
    /** Whether the product's service plan is copied onto this line. */
    serviceIncluded: boolean;
    onChange: (changes: { warranty_months?: number; service_plan_included?: boolean }) => void;
    idPrefix: string;
}

/**
 * The warranty and service plan of one sale line. Both start as what the product carries, can be changed or removed
 * for this sale only, and are fixed on the invoice once it is confirmed (a later product edit never reaches it).
 */
export function LineWarranty({ product, months, serviceIncluded, onChange, idPrefix }: LineWarrantyProps) {
    const hasServicePlan = (product?.service_plan_templates_count ?? 0) > 0;

    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <label htmlFor={`${idPrefix}-warranty`} className="flex items-center gap-1.5">
                Warranty
                <Input
                    id={`${idPrefix}-warranty`}
                    type="number"
                    min={0}
                    max={600}
                    step={1}
                    inputMode="numeric"
                    value={months || ''}
                    placeholder="None"
                    onChange={(e) => onChange({ warranty_months: e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value))) })}
                    className="h-7 w-20 text-right"
                />
                months
            </label>
            {hasServicePlan && (
                <label className="flex items-center gap-1.5">
                    <Checkbox checked={serviceIncluded} onCheckedChange={(checked) => onChange({ service_plan_included: checked === true })} />
                    Service plan
                </label>
            )}
        </div>
    );
}
