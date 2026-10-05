import { getCompanyLoanActions } from '@/components/company-loans/company-loan-actions';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { type CompanyLoanListItem } from '@/types/models';
import { Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const LOAN_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'lender', label: 'Lender' },
    { id: 'loan_amount', label: 'Loan Amount' },
    { id: 'interest_rate', label: 'Interest' },
    { id: 'outstanding_balance', label: 'Outstanding' },
    { id: 'start_date', label: 'Start Date' },
];

/** Matches `CompanyLoanExportController::COLUMN_LABELS` on the backend. */
export const LOAN_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'lender_name', label: 'Lender' },
    { id: 'loan_amount', label: 'Loan Amount' },
    { id: 'interest_rate', label: 'Interest Rate' },
    { id: 'outstanding_balance', label: 'Outstanding' },
    { id: 'start_date', label: 'Start Date' },
];

/** Table column → export columns that start ticked while it's visible. */
export const LOAN_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    lender: ['lender_name'],
    loan_amount: ['loan_amount'],
    interest_rate: ['interest_rate'],
    outstanding_balance: ['outstanding_balance'],
    start_date: ['start_date'],
};

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    onEdit: (loan: CompanyLoanListItem) => void;
    onDelete: (loan: CompanyLoanListItem) => void;
}

export function useLoanColumns({ sort, direction = 'asc', onSort, selection, money, onEdit, onDelete }: Options) {
    return useMemo<ColumnDef<CompanyLoanListItem>[]>(() => {
        const header = (title: string, sortKey: string, align?: 'right') => () => (
            <DataTableColumnHeader
                title={title}
                sortKey={sortKey}
                currentSort={sort ?? ''}
                currentDirection={direction}
                onSort={onSort}
                align={align}
            />
        );

        return [
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
                cell: ({ row }) => <DataTableRowActions actions={getCompanyLoanActions(row.original, { onEdit, onDelete })} />,
            },
            {
                id: 'lender',
                header: header('Lender', 'lender_name'),
                cell: ({ row }) => (
                    <Link href={route('company-loans.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.lender_name}
                    </Link>
                ),
            },
            {
                id: 'loan_amount',
                header: header('Loan Amount', 'loan_amount', 'right'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.loan_amount),
            },
            {
                id: 'interest_rate',
                header: 'Interest',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => (row.original.interest_rate ? `${row.original.interest_rate}%` : '—'),
            },
            {
                id: 'outstanding_balance',
                header: header('Outstanding', 'current_balance', 'right'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.outstanding_balance),
            },
            { id: 'start_date', header: 'Start Date', meta: { cellClassName: 'whitespace-nowrap' }, cell: ({ row }) => row.original.start_date },
        ];
    }, [money, selection, sort, direction, onSort, onEdit, onDelete]);
}
