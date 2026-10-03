import { getSaleActions } from '@/components/sales/sale-actions';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import ContactLink from '@/components/shared/contact-link';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format-date';
import { statusTone } from '@/lib/status-tones';
import { type PaymentStatusValue, type SaleListItem, type SaleStatusValue } from '@/types/models';
import { Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const statusColor: Record<SaleStatusValue, string> = {
    draft: 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400',
    quotation: statusTone.info,
    confirmed: statusTone.success,
    cancelled: statusTone.danger,
};

export const paymentStatusColor: Record<PaymentStatusValue, string> = {
    due: statusTone.danger,
    partial: statusTone.warning,
    paid: statusTone.success,
};

export const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'invoice', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'date', label: 'Date' },
    { id: 'total', label: 'Total' },
    { id: 'due', label: 'Due' },
    { id: 'payment_status', label: 'Payment' },
    { id: 'status', label: 'Status' },
    { id: 'added_by', label: 'Added by' },
];

/** Fine-grained export columns — matches `SaleExportController::COLUMN_LABELS` on the backend. */
export const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'invoice_no', label: 'Invoice No' },
    { id: 'customer', label: 'Customer' },
    { id: 'sale_date', label: 'Sale Date' },
    { id: 'total_amount', label: 'Total' },
    { id: 'due_amount', label: 'Due' },
    { id: 'payment_status', label: 'Payment Status' },
    { id: 'status', label: 'Status' },
    { id: 'source', label: 'Source' },
];

interface UseSaleColumnsOptions {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort?: (key: string) => void;
    money: (value: number) => string;
    selection: {
        isSelected: (id: number) => boolean;
        toggle: (id: number, checked: boolean) => void;
        toggleAll: (checked: boolean) => void;
        isAllSelected: boolean;
        isSomeSelected: boolean;
    };
    onDelete: (sale: SaleListItem) => void;
    onAddPayment: (sale: SaleListItem) => void;
    onViewPayments: (sale: SaleListItem) => void;
}

/** Column definitions for the Sales table — kept next to the page, not inside the generic DataTable. */
export function useSaleColumns({ sort, direction, onSort, money, selection, onDelete, onAddPayment, onViewPayments }: UseSaleColumnsOptions) {
    return useMemo<ColumnDef<SaleListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getSaleActions(row.original, { onDelete, onAddPayment, onViewPayments })} />,
            },
            {
                id: 'invoice',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title="Invoice"
                        sortKey="invoice_no"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'desc'}
                        onSort={onSort}
                    />
                ) : 'Invoice',
                cell: ({ row }) => (
                    <>
                        <Link href={route('sales.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                            {row.original.invoice_no}
                        </Link>
                        {row.original.source === 'imported' && (
                            <Badge variant="outline" className="ml-2">
                                Historical
                            </Badge>
                        )}
                    </>
                ),
            },
            {
                id: 'customer',
                header: 'Customer',
                cell: ({ row }) => <ContactLink id={row.original.customer.id} name={row.original.customer.name} />,
            },
            {
                id: 'date',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title="Date"
                        sortKey="sale_date"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'desc'}
                        onSort={onSort}
                    />
                ) : 'Date',
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDateTime(row.original.created_at ?? row.original.sale_date),
            },
            {
                id: 'total',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title="Total"
                        sortKey="total_amount"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'desc'}
                        onSort={onSort}
                        align="right"
                    />
                ) : 'Total',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_amount),
            },
            {
                id: 'due',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title="Due"
                        sortKey="due_amount"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'desc'}
                        onSort={onSort}
                        align="right"
                    />
                ) : 'Due',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.due_amount),
            },
            {
                id: 'payment_status',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title="Payment"
                        sortKey="payment_status"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'desc'}
                        onSort={onSort}
                    />
                ) : 'Payment',
                cell: ({ row }) => (
                    <Badge variant="outline" className={paymentStatusColor[row.original.payment_status]}>
                        {humanize(row.original.payment_status)}
                    </Badge>
                ),
            },
            {
                id: 'status',
                header: onSort ? () => (
                    <DataTableColumnHeader
                        title="Status"
                        sortKey="status"
                        currentSort={sort ?? ''}
                        currentDirection={direction ?? 'desc'}
                        onSort={onSort}
                    />
                ) : 'Status',
                cell: ({ row }) => (
                    <Badge variant="outline" className={statusColor[row.original.status]}>
                        {humanize(row.original.status)}
                    </Badge>
                ),
            },
            { id: 'added_by', header: 'Added by', cell: ({ row }) => <span className="text-muted-foreground">{row.original.added_by ?? '—'}</span> },
        ],
        [money, selection, onDelete, onAddPayment, onViewPayments, sort, direction, onSort],
    );
}
