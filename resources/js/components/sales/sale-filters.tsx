import DateRangeFilter from '@/components/shared/date-range-filter';
import SearchableSelect from '@/components/shared/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type CustomerOption, type DateRangePresetValue, type PaymentStatusValue, type SaleStatusValue } from '@/types/models';

export interface SaleFilterValues {
    /** `'all'` = no date limit; the server defaults to `'today'` when the page is opened without a date filter. */
    preset: DateRangePresetValue | 'all';
    from: string | null;
    to: string | null;
    customer_id: number | null;
    status: SaleStatusValue | null;
    payment_status: PaymentStatusValue | null;
}

interface SaleFiltersProps {
    filters: SaleFilterValues;
    /** The filtered customer's label (kept locally so the picker shows it right after choosing). */
    customer: CustomerOption | null;
    onCustomerChange: (customer: CustomerOption | null) => void;
    onChange: (changes: Partial<SaleFilterValues>) => void;
}

/** The Sales list's filter panel: date range (Today by default), customer, status and payment status. */
export function SaleFilters({ filters, customer, onCustomerChange, onChange }: SaleFiltersProps) {
    return (
        <div className="flex flex-wrap items-end gap-3">
            <DateRangeFilter
                allowClear
                range={{ preset: filters.preset === 'all' ? null : filters.preset, from: filters.from, to: filters.to }}
                onChange={(next) => onChange({ preset: next.preset ?? 'all', from: next.from ?? null, to: next.to ?? null })}
            />

            <SearchableSelect
                className="w-48"
                value={customer}
                onChange={(next) => {
                    onCustomerChange(next);
                    onChange({ customer_id: next?.id ?? null });
                }}
                getLabel={(option) => option.name}
                getSublabel={(option) => option.phone ?? ''}
                searchUrl={route('contacts.search')}
                searchParams={{ type: 'customer' }}
                placeholder="All customers"
                clearable
            />

            <Select
                value={filters.status ?? 'all'}
                onValueChange={(value) => onChange({ status: value === 'all' ? null : (value as SaleStatusValue) })}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="quotation">Quotation</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.payment_status ?? 'all'}
                onValueChange={(value) => onChange({ payment_status: value === 'all' ? null : (value as PaymentStatusValue) })}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All payments</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
