import { FormInput } from '@/components/form/form-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type CustomerOption, type SalesOrderStatusValue } from '@/types/models';

/** `open` (the default) = still waiting to be confirmed; `all` also shows confirmed and cancelled orders. */
export type SalesOrderStatusFilter = SalesOrderStatusValue | 'open' | 'all';

export interface SalesOrderFilterValues {
    from: string | null;
    to: string | null;
    customer_id: number | null;
    status: SalesOrderStatusFilter | null;
}

interface SalesOrderFiltersProps {
    filters: SalesOrderFilterValues;
    /** The filtered customer's label (kept locally so the picker shows it right after choosing). */
    customer: CustomerOption | null;
    onCustomerChange: (customer: CustomerOption | null) => void;
    onChange: (changes: Partial<SalesOrderFilterValues>) => void;
}

/** The Sales Orders list's filter panel: from / to, customer and status. */
export function SalesOrderFilters({ filters, customer, onCustomerChange, onChange }: SalesOrderFiltersProps) {
    return (
        <div className="flex flex-wrap items-end gap-3">
            <FormInput
                id="from"
                label="From"
                type="date"
                value={filters.from ?? ''}
                onChange={(e) => onChange({ from: e.target.value || null })}
                className="w-40"
            />
            <FormInput
                id="to"
                label="To"
                type="date"
                value={filters.to ?? ''}
                onChange={(e) => onChange({ to: e.target.value || null })}
                className="w-40"
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
                value={filters.status ?? 'open'}
                onValueChange={(value) => onChange({ status: value === 'open' ? null : (value as SalesOrderStatusFilter) })}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="open">Waiting to confirm</SelectItem>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
