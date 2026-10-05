import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getOtherLiabilityActions } from '@/components/other-liabilities/other-liability-actions';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { type OtherLiabilityListItem } from '@/types/models';
import { Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const LIABILITY_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'name', label: 'Name' },
    { id: 'current_balance', label: 'Current Balance' },
];

/** Matches `OtherLiabilityExportController::COLUMN_LABELS` on the backend. */
export const LIABILITY_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'name', label: 'Name' },
    { id: 'opening_amount', label: 'Opening Amount' },
    { id: 'current_balance', label: 'Current Balance' },
];

/** Table column → export columns that start ticked while it's visible. */
export const LIABILITY_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    name: ['name'],
    current_balance: ['current_balance'],
};

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    onEdit: (liability: OtherLiabilityListItem) => void;
    onDelete: (liability: OtherLiabilityListItem) => void;
}

export function useLiabilityColumns({ sort, direction = 'asc', onSort, selection, money, onEdit, onDelete }: Options) {
    return useMemo<ColumnDef<OtherLiabilityListItem>[]>(
        () => [
            {
                id: 'select',
                header: () => (
                    <DataTableCheckbox
                        checked={selection.isAllSelected ? true : selection.isSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={selection.toggleAll}
                    />
                ),
                meta: { headerClassName: 'w-10', cellClassName: 'w-10', printHidden: true },
                cell: ({ row }) => (
                    <DataTableCheckbox
                        checked={selection.isSelected(row.original.id)}
                        onCheckedChange={(checked) => selection.toggle(row.original.id, checked)}
                    />
                ),
            },
            {
                id: 'actions',
                header: '',
                meta: { headerClassName: 'w-10', cellClassName: 'w-10', printHidden: true },
                cell: ({ row }) => <DataTableRowActions actions={getOtherLiabilityActions(row.original, { onEdit, onDelete })} />,
            },
            {
                id: 'name',
                header: () => (
                    <DataTableColumnHeader title="Name" sortKey="name" currentSort={sort ?? ''} currentDirection={direction} onSort={onSort} />
                ),
                cell: ({ row }) => (
                    <Link href={route('other-liabilities.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.name}
                    </Link>
                ),
            },
            {
                id: 'current_balance',
                header: () => (
                    <DataTableColumnHeader
                        title="Current Balance"
                        sortKey="current_balance"
                        currentSort={sort ?? ''}
                        currentDirection={direction}
                        onSort={onSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.current_balance),
            },
        ],
        [money, selection, sort, direction, onSort, onEdit, onDelete],
    );
}
