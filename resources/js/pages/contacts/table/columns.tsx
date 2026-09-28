import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions, { type RowAction } from '@/components/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import { statusTone } from '@/lib/status-tones';
import { type ContactListItem, type ContactType } from '@/types/models';
import { Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const useContactTypeLabel = (): Record<ContactType, string> => {
    const { t } = useTranslation();

    return {
        customer: t('nav', 'customer'),
        supplier: t('nav', 'supplier'),
        both: t('common', 'both'),
    };
};

export const typeColor: Record<ContactType, string> = {
    customer: statusTone.info,
    supplier: 'border-transparent bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
    both: 'border-transparent bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
};

export const activeColor = (isActive: boolean) =>
    isActive ? statusTone.success : 'border-transparent bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400';

interface UseContactColumnsOptions {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort?: (key: string) => void;
    selection: {
        isSelected: (id: number) => boolean;
        toggle: (id: number, checked: boolean) => void;
        toggleAll: (checked: boolean) => void;
        isAllSelected: boolean;
        isSomeSelected: boolean;
    };
    contactActions: (contact: ContactListItem) => RowAction[];
}

/** Column definitions for the Contacts table — kept next to the page, not inside the generic DataTable. */
export function useContactColumns({ sort, direction, onSort, selection, contactActions }: UseContactColumnsOptions) {
    const { t } = useTranslation();
    const typeLabel = useContactTypeLabel();
    const money = useMoneyFormat();

    return useMemo<ColumnDef<ContactListItem>[]>(
        () => [
            {
                id: 'select',
                header: () => (
                    <Checkbox
                        checked={selection.isAllSelected ? true : selection.isSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={(checked) => selection.toggleAll(checked === true)}
                    />
                ),
                meta: { headerClassName: 'w-10', cellClassName: 'w-10' },
                cell: ({ row }) => (
                    <Checkbox
                        checked={selection.isSelected(row.original.id)}
                        onCheckedChange={(checked) => selection.toggle(row.original.id, checked === true)}
                    />
                ),
            },
            {
                id: 'actions',
                header: '',
                meta: { headerClassName: 'w-10', cellClassName: 'w-10' },
                cell: ({ row }) => <DataTableRowActions actions={contactActions(row.original)} />,
            },
            {
                id: 'contact_id',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title={t('contactColumns', 'contact_id')}
                        sortKey="contact_code"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'asc'}
                        onSort={onSort}
                    />
                ) : t('contactColumns', 'contact_id'),
                cell: ({ row }) => row.original.contact_code ?? '—',
            },
            {
                id: 'name',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title={t('common', 'name')}
                        sortKey="name"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'asc'}
                        onSort={onSort}
                    />
                ) : t('common', 'name'),
                cell: ({ row }) => (
                    <>
                        <Link href={route('contacts.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                            {row.original.display_name}
                        </Link>
                        {row.original.business_name && <div className="text-muted-foreground text-xs">{row.original.name}</div>}
                    </>
                ),
            },
            {
                id: 'contact',
                header: t('contactColumns', 'contact_label'),
                cell: ({ row }) => (
                    <>
                        <div>{row.original.phone}</div>
                        {row.original.email && <div className="text-muted-foreground text-xs">{row.original.email}</div>}
                    </>
                ),
            },
            {
                id: 'address',
                header: t('contactColumns', 'address'),
                cell: ({ row }) => <span className="line-clamp-2">{row.original.address ?? '—'}</span>,
            },
            {
                id: 'type',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title={t('contactsPage', 'type')}
                        sortKey="type"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'asc'}
                        onSort={onSort}
                    />
                ) : t('contactsPage', 'type'),
                cell: ({ row }) => (
                    <>
                        <Badge variant="outline" className={typeColor[row.original.type]}>
                            {typeLabel[row.original.type]}
                        </Badge>
                        {row.original.customer_group && <div className="text-muted-foreground mt-1 text-xs">{row.original.customer_group.name}</div>}
                    </>
                ),
            },
            {
                id: 'balance',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title={t('contactColumns', 'balance')}
                        sortKey="balance"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'asc'}
                        onSort={onSort}
                        align="right"
                    />
                ) : t('contactColumns', 'balance'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                // Payable shows negative, receivable positive, settled 0 — `balance` is already
                // signed that way (see LedgerService), so no word label is needed here.
                cell: ({ row }) => money(row.original.balance),
            },
            {
                id: 'status',
                header: t('common', 'status'),
                cell: ({ row }) => (
                    <Badge variant="outline" className={activeColor(row.original.is_active)}>
                        {row.original.is_active ? t('common', 'active') : t('common', 'inactive')}
                    </Badge>
                ),
            },
        ],
        [selection, contactActions, t, typeLabel, money, sort, direction, onSort],
    );
}
