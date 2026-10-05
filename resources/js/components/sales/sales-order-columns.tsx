import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getSalesOrderActions } from '@/components/sales/sales-order-actions';
import ContactLink from '@/components/shared/contact-link';
import { Badge } from '@/components/ui/badge';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { formatDate } from '@/lib/format-date';
import { type SalesOrderListItem, type SalesOrderStatusValue } from '@/types/models';
import { Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const SALES_ORDER_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'order_no', label: 'Order No' },
    { id: 'customer', label: 'Customer' },
    { id: 'order_date', label: 'Order Date' },
    { id: 'expected_delivery_date', label: 'Expected Delivery' },
    { id: 'total', label: 'Total' },
    { id: 'advance', label: 'Advance' },
    { id: 'due', label: 'Due' },
    { id: 'status', label: 'Status' },
    { id: 'added_by', label: 'Added by' },
];

/** Matches `SalesOrderExportController::COLUMN_LABELS` on the backend. */
export const SALES_ORDER_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'order_no', label: 'Order No' },
    { id: 'customer', label: 'Customer' },
    { id: 'order_date', label: 'Order Date' },
    { id: 'expected_delivery_date', label: 'Expected Delivery' },
    { id: 'total_amount', label: 'Total' },
    { id: 'advance_paid', label: 'Advance' },
    { id: 'due_amount', label: 'Due' },
    { id: 'status', label: 'Status' },
];

/** Table column → export columns that start ticked while it's visible. */
export const SALES_ORDER_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    order_no: ['order_no'],
    customer: ['customer'],
    order_date: ['order_date'],
    expected_delivery_date: ['expected_delivery_date'],
    total: ['total_amount'],
    advance: ['advance_paid'],
    due: ['due_amount'],
    status: ['status'],
};

export const salesOrderStatusVariant: Record<SalesOrderStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    pending: 'outline',
    partial: 'outline',
    completed: 'secondary',
    cancelled: 'destructive',
};

export const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
}

export function useSalesOrderColumns({ sort, direction = 'desc', onSort, selection, money }: Options) {
    return useMemo<ColumnDef<SalesOrderListItem>[]>(() => {
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
                cell: ({ row }) => <DataTableRowActions actions={getSalesOrderActions(row.original)} />,
            },
            {
                id: 'order_no',
                header: header('Order No', 'order_no'),
                cell: ({ row }) => (
                    <Link href={route('sales-orders.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.order_no}
                    </Link>
                ),
            },
            {
                id: 'customer',
                header: 'Customer',
                cell: ({ row }) => <ContactLink id={row.original.customer.id} name={row.original.customer.name} />,
            },
            {
                id: 'order_date',
                header: header('Order Date', 'order_date'),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.order_date),
            },
            {
                id: 'expected_delivery_date',
                header: 'Expected Delivery',
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => (row.original.expected_delivery_date ? formatDate(row.original.expected_delivery_date) : '—'),
            },
            {
                id: 'total',
                header: header('Total', 'total_amount', 'right'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_amount),
            },
            {
                id: 'advance',
                header: header('Advance', 'advance_paid', 'right'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.advance_paid),
            },
            {
                id: 'due',
                header: 'Due',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.due_amount),
            },
            {
                id: 'status',
                header: header('Status', 'status'),
                cell: ({ row }) => <Badge variant={salesOrderStatusVariant[row.original.status]}>{humanize(row.original.status)}</Badge>,
            },
            { id: 'added_by', header: 'Added by', cell: ({ row }) => <span className="text-muted-foreground">{row.original.added_by ?? '—'}</span> },
        ];
    }, [money, selection, sort, direction, onSort]);
}
