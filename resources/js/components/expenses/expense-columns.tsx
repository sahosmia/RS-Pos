import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getExpenseActions } from '@/components/expenses/expense-actions';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { formatDateTime } from '@/lib/format-date';
import { type ExpenseListItem } from '@/types/models';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const EXPENSE_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'account', label: 'Account' },
    { id: 'note', label: 'Note' },
    { id: 'total', label: 'Amount' },
    { id: 'added_by', label: 'Added by' },
];

/** Matches `ExpenseExportController::COLUMN_LABELS` on the backend. */
export const EXPENSE_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'expense_date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'account', label: 'Account' },
    { id: 'note', label: 'Note' },
    { id: 'total_amount', label: 'Amount' },
];

/** Table column → export columns that start ticked while it's visible. */
export const EXPENSE_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    date: ['expense_date'],
    category: ['category'],
    account: ['account'],
    note: ['note'],
    total: ['total_amount'],
};

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    onEdit: (expense: ExpenseListItem) => void;
    onDelete: (expense: ExpenseListItem) => void;
}

export function useExpenseColumns({ sort, direction = 'desc', onSort, selection, money, onEdit, onDelete }: Options) {
    return useMemo<ColumnDef<ExpenseListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getExpenseActions(row.original, { onEdit, onDelete })} />,
            },
            {
                id: 'date',
                header: () => (
                    <DataTableColumnHeader
                        title="Date"
                        sortKey="expense_date"
                        currentSort={sort ?? ''}
                        currentDirection={direction}
                        onSort={onSort}
                    />
                ),
                meta: { cellClassName: 'whitespace-nowrap', label: 'Date & Time' },
                cell: ({ row }) => formatDateTime(row.original.created_at ?? row.original.expense_date),
            },
            { id: 'category', header: 'Category', cell: ({ row }) => row.original.category.name },
            { id: 'account', header: 'Account', cell: ({ row }) => row.original.account?.name ?? '—' },
            {
                id: 'note',
                header: 'Note',
                meta: { cellClassName: 'max-w-xs' },
                cell: ({ row }) =>
                    row.original.note ? (
                        <span className="text-muted-foreground line-clamp-2 break-words" title={row.original.note}>
                            {row.original.note}
                        </span>
                    ) : (
                        <span className="text-muted-foreground/60">—</span>
                    ),
            },
            {
                id: 'total',
                header: () => (
                    <DataTableColumnHeader
                        title="Amount"
                        sortKey="total_amount"
                        currentSort={sort ?? ''}
                        currentDirection={direction}
                        onSort={onSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_amount),
            },
            { id: 'added_by', header: 'Added by', cell: ({ row }) => <span className="text-muted-foreground">{row.original.added_by ?? '—'}</span> },
        ],
        [money, selection, sort, direction, onSort, onEdit, onDelete],
    );
}
