import { FormInput } from '@/components/form/form-input';
import { type SaleFormApi } from '@/components/sales/form/sale-form-utils';
import { Checkbox } from '@/components/ui/checkbox';

interface AdvancedOptionsProps {
    form: SaleFormApi;
    historical: boolean;
    onHistoricalChange: (historical: boolean) => void;
}

/** Collapsed-by-default extras: the quotation's expiry date and the "historical record" switch. */
export function AdvancedOptions({ form, historical, onHistoricalChange }: AdvancedOptionsProps) {
    return (
        <details className="group">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none text-xs font-medium">More options</summary>
            <div className="mt-3 space-y-3">
                <FormInput
                    id="valid_until"
                    label="Quotation valid until"
                    type="date"
                    value={form.data.valid_until ?? ''}
                    onChange={(e) => form.setData('valid_until', e.target.value)}
                    error={form.errors.valid_until}
                    helperText="শুধু Quotation সেভ করার সময় লাগে"
                />
                <FormInput
                    id="expected_delivery_date"
                    label="Expected delivery"
                    type="date"
                    value={form.data.expected_delivery_date}
                    onChange={(e) => form.setData('expected_delivery_date', e.target.value)}
                    error={form.errors.expected_delivery_date}
                    helperText="শুধু Sales Order সেভ করার সময় কাজে লাগে"
                />
                <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={historical} onCheckedChange={(c) => onHistoricalChange(c === true)} />
                    Historical record (stock বা balance বদলাবে না)
                </label>
            </div>
        </details>
    );
}
