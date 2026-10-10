import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getEmiInstallmentActions } from '@/components/sales/emi-installment-actions';
import ContactLink from '@/components/shared/contact-link';
import { StatusBadge } from '@/components/shared/status-badge';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { formatDate } from '@/lib/format-date';
import { type EmiInstallmentListItem } from '@/types/models';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const EMI_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'invoice', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'number', label: '#' },
    { id: 'due_date', label: 'Due Date' },
    { id: 'amount', label: 'Amount' },
    { id: 'paid', label: 'Paid' },
    { id: 'status', label: 'Status' },
];

/** Matches `EmiInstallmentExportController::COLUMN_LABELS` on the backend. */
export const EMI_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'invoice_no', label: 'Invoice No' },
    { id: 'customer', label: 'Customer' },
    { id: 'installment_number', label: 'Installment #' },
    { id: 'due_date', label: 'Due Date' },
    { id: 'amount', label: 'Amount' },
    { id: 'paid_amount', label: 'Paid' },
    { id: 'status', label: 'Status' },
];

/** Table column → export columns that start ticked while it's visible. */
export const EMI_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    invoice: ['invoice_no'],
    customer: ['customer'],
    number: ['installment_number'],
    due_date: ['due_date'],
    amount: ['amount'],
    paid: ['paid_amount'],
    status: ['status'],
};

export const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    onPay: (installment: EmiInstallmentListItem) => void;
}

export function useEmiInstallmentColumns({ sort, direction = 'asc', onSort, selection, money, onPay }: Options) {
    return useMemo<ColumnDef<EmiInstallmentListItem>[]>(() => {
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
                cell: ({ row }) => <DataTableRowActions actions={getEmiInstallmentActions(row.original, { onPay })} />,
            },
            { id: 'invoice', header: 'Invoice', cell: ({ row }) => row.original.invoice_no },
            {
                id: 'customer',
                header: 'Customer',
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <ContactLink id={row.original.customer.id} name={row.original.customer.name} />
                        {row.original.customer.phone && (
                            <div className="text-muted-foreground text-xs tabular-nums">{row.original.customer.phone}</div>
                        )}
                    </div>
                ),
            },
            {
                id: 'number',
                header: header('#', 'installment_number', 'right'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => row.original.installment_number,
            },
            {
                id: 'due_date',
                header: header('Due Date', 'due_date'),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.due_date),
            },
            {
                id: 'amount',
                header: header('Amount', 'amount', 'right'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.amount),
            },
            {
                id: 'paid',
                header: 'Paid',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.paid_amount),
            },
            {
                id: 'status',
                header: header('Status', 'status'),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
            },
        ];
    }, [money, selection, sort, direction, onSort, onPay]);
}
