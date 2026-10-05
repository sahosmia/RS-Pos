import { FormInput } from '@/components/form/form-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type PaymentStatusValue, type PurchaseStatusValue, type SupplierOption } from '@/types/models';

export interface PurchaseFilterValues {
    from: string | null;
    to: string | null;
    supplier_id: number | null;
    status: PurchaseStatusValue | null;
    payment_status: PaymentStatusValue | null;
}

interface PurchaseFiltersProps {
    filters: PurchaseFilterValues;
    /** The filtered supplier's label (kept locally so the picker shows it right after choosing). */
    supplier: SupplierOption | null;
    onSupplierChange: (supplier: SupplierOption | null) => void;
    onChange: (changes: Partial<PurchaseFilterValues>) => void;
}

/** The Purchases list's filter panel: from / to, supplier, status and payment status. */
export function PurchaseFilters({ filters, supplier, onSupplierChange, onChange }: PurchaseFiltersProps) {
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
                value={supplier}
                onChange={(next) => {
                    onSupplierChange(next);
                    onChange({ supplier_id: next?.id ?? null });
                }}
                getLabel={(option) => option.name}
                getSublabel={(option) => option.phone ?? ''}
                searchUrl={route('contacts.search')}
                searchParams={{ type: 'supplier' }}
                placeholder="All suppliers"
                clearable
            />

            <Select
                value={filters.status ?? 'all'}
                onValueChange={(value) => onChange({ status: value === 'all' ? null : (value as PurchaseStatusValue) })}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
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
