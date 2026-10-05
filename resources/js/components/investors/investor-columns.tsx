import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getInvestorActions } from '@/components/investors/investor-actions';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { type InvestorListItem } from '@/types/models';
import { Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const INVESTOR_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'name', label: 'Name' },
    { id: 'total', label: 'Total Invested' },
];

/** Matches `InvestorExportController::COLUMN_LABELS` on the backend. */
export const INVESTOR_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'name', label: 'Name' },
    { id: 'total_invested', label: 'Total Invested' },
];

/** Table column → export columns that start ticked while it's visible. */
export const INVESTOR_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    name: ['name'],
    total: ['total_invested'],
};

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    onEdit: (investor: InvestorListItem) => void;
    onDelete: (investor: InvestorListItem) => void;
}

export function useInvestorColumns({ sort, direction = 'asc', onSort, selection, money, onEdit, onDelete }: Options) {
    return useMemo<ColumnDef<InvestorListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getInvestorActions(row.original, { onEdit, onDelete })} />,
            },
            {
                id: 'name',
                header: () => (
                    <DataTableColumnHeader title="Name" sortKey="name" currentSort={sort ?? ''} currentDirection={direction} onSort={onSort} />
                ),
                cell: ({ row }) => (
                    <Link href={route('investors.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.name}
                    </Link>
                ),
            },
            {
                id: 'total',
                header: () => (
                    <DataTableColumnHeader
                        title="Total Invested"
                        sortKey="current_balance"
                        currentSort={sort ?? ''}
                        currentDirection={direction}
                        onSort={onSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_invested),
            },
        ],
        [money, selection, sort, direction, onSort, onEdit, onDelete],
    );
}
