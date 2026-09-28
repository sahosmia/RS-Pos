import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getSalesOrderActions } from '@/components/sales/sales-order-actions';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import ContactLink from '@/components/shared/contact-link';
import EmptyState from '@/components/shared/empty-state';
import SearchableSelect from '@/components/shared/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTableExport } from '@/hooks/table/use-table-export';
import { useTableFilters, type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format-date';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type CustomerOption, type Paginated, type SalesOrderListItem, type SalesOrderStatusValue } from '@/types/models';
import { Head, Link, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales Order', href: '/sales-orders' }];

interface SalesOrderFilters extends TableFilterBase {
    from: string | null;
    to: string | null;
    customer_id: number | null;
    status: SalesOrderStatusValue | null;
    per_page: number | 'all';
}

interface SalesOrdersIndexProps {
    orders: Paginated<SalesOrderListItem>;
    /** The currently-filtered customer's own label, or `null` when no customer filter is active. */
    initialCustomer: CustomerOption | null;
    filters: SalesOrderFilters;
}

const statusVariant: Record<SalesOrderStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    pending: 'outline',
    partial: 'outline',
    completed: 'secondary',
    cancelled: 'destructive',
};

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'order_no', label: 'Order No' },
    { id: 'customer', label: 'Customer' },
    { id: 'order_date', label: 'Order Date' },
    { id: 'expected_delivery_date', label: 'Expected Delivery' },
    { id: 'total', label: 'Total' },
    { id: 'advance', label: 'Advance' },
    { id: 'due', label: 'Due' },
    { id: 'status', label: 'Status' },
];

/** Matches `SalesOrderExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'order_no', label: 'Order No' },
    { id: 'customer', label: 'Customer' },
    { id: 'order_date', label: 'Order Date' },
    { id: 'expected_delivery_date', label: 'Expected Delivery' },
    { id: 'total_amount', label: 'Total' },
    { id: 'advance_paid', label: 'Advance' },
    { id: 'due_amount', label: 'Due' },
    { id: 'status', label: 'Status' },
];

export default function SalesOrdersIndex({ orders, initialCustomer, filters }: SalesOrdersIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    // `initialCustomer` comes from the server on every filtered request (this page reuses one
    // instance via `preserveState`, so a prop change alone wouldn't otherwise re-sync local state).
    useEffect(() => {
        setCustomer(initialCustomer);
    }, [initialCustomer]);

    const { isLoading, applyFilters, handleSort, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'sales-orders.index',
        filters,
        emptyFilters: { from: null, to: null, customer_id: null, status: null },
    });

    const selection = useTableSelection({
        rows: orders.data,
        getId: (order) => order.id,
    });

    const handleExport = useTableExport({
        routeName: 'sales-orders.export',
        filters,
        filterKeys: ['from', 'to', 'customer_id', 'status'],
        selectedIds: selection.selectedIds,
    });

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('order_no')) ids.push('order_no');
        if (isVisible('customer')) ids.push('customer');
        if (isVisible('order_date')) ids.push('order_date');
        if (isVisible('expected_delivery_date')) ids.push('expected_delivery_date');
        if (isVisible('total')) ids.push('total_amount');
        if (isVisible('advance')) ids.push('advance_paid');
        if (isVisible('due')) ids.push('due_amount');
        if (isVisible('status')) ids.push('status');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<SalesOrderListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getSalesOrderActions(row.original)} />,
            },
            {
                id: 'order_no',
                header: () => (
                    <DataTableColumnHeader
                        title="Order No"
                        sortKey="order_no"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                    />
                ),
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
                header: () => (
                    <DataTableColumnHeader
                        title="Order Date"
                        sortKey="order_date"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                    />
                ),
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
                header: () => (
                    <DataTableColumnHeader
                        title="Total"
                        sortKey="total_amount"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_amount),
            },
            {
                id: 'advance',
                header: () => (
                    <DataTableColumnHeader
                        title="Advance"
                        sortKey="advance_paid"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
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
                header: () => (
                    <DataTableColumnHeader
                        title="Status"
                        sortKey="status"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                    />
                ),
                cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{humanize(row.original.status)}</Badge>,
            },
        ],
        [money, selection, filters.sort, filters.direction, handleSort],
    );

    const renderGridCard = useCallback(
        (order: SalesOrderListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox
                            checked={selection.isSelected(order.id)}
                            onCheckedChange={(checked) => selection.toggle(order.id, checked)}
                        />
                        <div className="min-w-0">
                            <Link href={route('sales-orders.show', order.id)} className="truncate font-medium underline-offset-2 hover:underline">
                                {order.order_no}
                            </Link>
                            <div className="text-muted-foreground text-xs">
                                <ContactLink id={order.customer.id} name={order.customer.name} />
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(order.total_amount)}</span>
                        <DataTableRowActions actions={getSalesOrderActions(order)} />
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(order.order_date)}
                        {order.due_amount > 0 && ` · Due ${money(order.due_amount)}`}
                    </span>
                    <Badge variant={statusVariant[order.status]}>{humanize(order.status)}</Badge>
                </div>
            </div>
        ),
        [money, selection],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Order" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Sales Order" description="অগ্রিম বুকিং — নির্দিষ্ট সময়ে ডেলিভারির জন্য" />
                    <Button asChild>
                        <Link href={route('sales-orders.create')}>Add Sales Order</Link>
                    </Button>
                </div>

                <DataTableToolbar
                    activeFilterCount={activeFilterCount}
                    canReset={canReset}
                    onReset={resetFilters}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    visibilityColumns={getVisibilityColumns()}
                    columnVisibility={columnVisibility}
                    onVisibilityChange={(id, visible) => setColumnVisibility((current) => ({ ...current, [id]: visible }))}
                    exportColumns={getExportColumns()}
                    defaultExportColumns={defaultExportColumns}
                    totalCount={orders.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <FormInput
                                id="from"
                                label="From"
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) => applyFilters({ from: e.target.value || null })}
                                className="w-40"
                            />
                            <FormInput
                                id="to"
                                label="To"
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) => applyFilters({ to: e.target.value || null })}
                                className="w-40"
                            />

                            <SearchableSelect
                                className="w-48"
                                value={customer}
                                onChange={(next) => {
                                    setCustomer(next);
                                    applyFilters({ customer_id: next?.id ?? null });
                                }}
                                getLabel={(option) => option.name}
                                getSublabel={(option) => option.phone ?? ''}
                                searchUrl={route('contacts.search')}
                                searchParams={{ type: 'customer' }}
                                placeholder="All customers"
                                clearable
                            />

                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={(value) => applyFilters({ status: value === 'all' ? null : (value as SalesOrderStatusValue) })}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="partial">Partial</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                <DataTable
                    columns={columns}
                    data={orders.data}
                    getRowKey={(order) => order.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title="No sales orders yet" description="প্রথম sales order যোগ করুন">
                            <Button className="mt-2" asChild>
                                <Link href={route('sales-orders.create')}>Add Sales Order</Link>
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No sales orders match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={orders}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="orders"
                        />
                    }
                />
            </div>
        </AppLayout>
    );
}
