import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { formatDate } from '@/lib/format-date';
import { type OtherIncomeListItem } from '@/types/models';
import { type ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { useMemo } from 'react';

export const INCOME_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'account', label: 'Account' },
    { id: 'note', label: 'Note' },
    { id: 'amount', label: 'Amount' },
    { id: 'added_by', label: 'Added by' },
];

/** Matches `OtherIncomeExportController::COLUMN_LABELS` on the backend. */
export const INCOME_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'income_date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'account', label: 'Account' },
    { id: 'note', label: 'Note' },
    { id: 'amount', label: 'Amount' },
];

/** Table column → export columns that start ticked while it's visible. */
export const INCOME_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    date: ['income_date'],
    category: ['category'],
    account: ['account'],
    note: ['note'],
    amount: ['amount'],
};

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    onDelete: (income: OtherIncomeListItem) => void;
}

export function useIncomeColumns({ sort, direction = 'desc', onSort, selection, money, onDelete }: Options) {
    return useMemo<ColumnDef<OtherIncomeListItem>[]>(
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
                id: 'date',
                header: () => (
                    <DataTableColumnHeader title="Date" sortKey="income_date" currentSort={sort ?? ''} currentDirection={direction} onSort={onSort} />
                ),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.income_date),
            },
            { id: 'category', header: 'Category', cell: ({ row }) => row.original.category.name },
            { id: 'account', header: 'Account', cell: ({ row }) => row.original.account.name },
            { id: 'note', header: 'Note', cell: ({ row }) => <span className="text-muted-foreground">{row.original.note}</span> },
            {
                id: 'amount',
                header: () => (
                    <DataTableColumnHeader
                        title="Amount"
                        sortKey="amount"
                        currentSort={sort ?? ''}
                        currentDirection={direction}
                        onSort={onSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.amount),
            },
            {
                id: 'actions',
                header: '',
                meta: { headerClassName: 'w-10', cellClassName: 'w-10', printHidden: true },
                cell: ({ row }) => (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-8"
                        onClick={() => onDelete(row.original)}
                        aria-label="Delete income"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                ),
            },
            { id: 'added_by', header: 'Added by', cell: ({ row }) => <span className="text-muted-foreground">{row.original.added_by ?? '—'}</span> },
        ],
        [money, selection, sort, direction, onSort, onDelete],
    );
}
