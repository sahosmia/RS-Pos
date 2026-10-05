import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { type ContactType, type CustomerGroup } from '@/types/models';

export interface ContactFilterValues {
    type: ContactType | null;
    customer_group_id: number | null;
}

interface ContactFiltersProps {
    filters: ContactFilterValues;
    customerGroups: CustomerGroup[];
    onChange: (changes: Partial<ContactFilterValues>) => void;
}

/** The Contacts list's filter panel: customer / supplier / both, and customer group. */
export function ContactFilters({ filters, customerGroups, onChange }: ContactFiltersProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap items-end gap-3">
            <Select value={filters.type ?? 'all'} onValueChange={(value) => onChange({ type: value === 'all' ? null : (value as ContactType) })}>
                <SelectTrigger className="w-44">
                    <SelectValue placeholder={t('contactsPage', 'type')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('contactsPage', 'all_types')}</SelectItem>
                    <SelectItem value="customer">{t('nav', 'customer')}</SelectItem>
                    <SelectItem value="supplier">{t('nav', 'supplier')}</SelectItem>
                    <SelectItem value="both">{t('common', 'both')}</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.customer_group_id ? String(filters.customer_group_id) : 'all'}
                onValueChange={(value) => onChange({ customer_group_id: value === 'all' ? null : Number(value) })}
            >
                <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('nav', 'customer_group')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('contactsPage', 'all_groups')}</SelectItem>
                    {customerGroups.map((group) => (
                        <SelectItem key={group.id} value={String(group.id)}>
                            {group.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
