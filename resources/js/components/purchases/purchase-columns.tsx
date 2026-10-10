import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getPurchaseActions } from '@/components/purchases/purchase-actions';
import ContactLink from '@/components/shared/contact-link';
import { StatusBadge } from '@/components/shared/status-badge';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { formatDateTime } from '@/lib/format-date';
import { type PurchaseListItem } from '@/types/models';
import { Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const PURCHASE_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'invoice', label: 'Invoice' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'date', label: 'Date' },
    { id: 'total', label: 'Total' },
    { id: 'due', label: 'Due' },
    { id: 'payment_status', label: 'Payment' },
    { id: 'status', label: 'Status' },
    { id: 'added_by', label: 'Added by' },
];

/** Matches `PurchaseExportController::COLUMN_LABELS` on the backend. */
export const PURCHASE_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'invoice_no', label: 'Invoice No' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'purchase_date', label: 'Purchase Date' },
    { id: 'total_amount', label: 'Total' },
    { id: 'due_amount', label: 'Due' },
    { id: 'payment_status', label: 'Payment Status' },
    { id: 'status', label: 'Status' },
];

/** Table column → export columns that start ticked while it's visible. */
export const PURCHASE_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    invoice: ['invoice_no'],
    supplier: ['supplier'],
    date: ['purchase_date'],
    total: ['total_amount'],
    due: ['due_amount'],
    payment_status: ['payment_status'],
    status: ['status'],
};

export const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    onDelete: (purchase: PurchaseListItem) => void;
}

export function usePurchaseColumns({ sort, direction = 'desc', onSort, selection, money, onDelete }: Options) {
    return useMemo<ColumnDef<PurchaseListItem>[]>(() => {
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
                cell: ({ row }) => <DataTableRowActions actions={getPurchaseActions(row.original, { onDelete })} />,
            },
            {
                id: 'invoice',
                header: header('Invoice', 'invoice_no'),
                cell: ({ row }) => (
                    <Link href={route('purchases.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.invoice_no}
                    </Link>
                ),
            },
            {
                id: 'supplier',
                header: 'Supplier',
                cell: ({ row }) => <ContactLink id={row.original.supplier.id} name={row.original.supplier.name} />,
            },
            {
                id: 'date',
                header: header('Date', 'purchase_date'),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDateTime(row.original.created_at ?? row.original.purchase_date),
            },
            {
                id: 'total',
                header: header('Total', 'total_amount', 'right'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_amount),
            },
            {
                id: 'due',
                header: header('Due', 'due_amount', 'right'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.due_amount),
            },
            {
                id: 'payment_status',
                header: header('Payment', 'payment_status'),
                cell: ({ row }) => <StatusBadge status={row.original.payment_status} />,
            },
            {
                id: 'status',
                header: header('Status', 'status'),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
            },
            { id: 'added_by', header: 'Added by', cell: ({ row }) => <span className="text-muted-foreground">{row.original.added_by ?? '—'}</span> },
        ];
    }, [money, selection, sort, direction, onSort, onDelete]);
}
