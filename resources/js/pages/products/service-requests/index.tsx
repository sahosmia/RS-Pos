import HeadingSmall from '@/components/heading-small';
import ContactLink from '@/components/shared/contact-link';
import EmptyState from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { FormInput } from '@/components/form/form-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/format-date';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Paginated, type ServiceRequestListItem, type ServiceRequestStatusValue, type ServiceRequestTypeValue } from '@/types/models';
import { Head, Link, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

interface ServiceRequestFilters extends TableFilterBase {
    status: ServiceRequestStatusValue | null;
    type: ServiceRequestTypeValue | null;
    from: string | null;
    to: string | null;
    per_page: number | 'all';
}

interface ServiceRequestsIndexProps {
    requests: Paginated<ServiceRequestListItem>;
    filters: ServiceRequestFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'date', label: 'Date' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'product', label: 'Product' },
    { id: 'type', label: 'Type' },
    { id: 'charge', label: 'Charge' },
    { id: 'status', label: 'Status' },
];

/** Matches `ServiceRequestExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'request_date', label: 'Date' },
    { id: 'invoice_no', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'product', label: 'Product' },
    { id: 'type', label: 'Type' },
    { id: 'charge_amount', label: 'Charge' },
    { id: 'staff', label: 'Staff' },
    { id: 'status', label: 'Status' },
];

const statusVariant: Record<ServiceRequestStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    pending: 'outline',
    scheduled: 'outline',
    completed: 'secondary',
    cancelled: 'destructive',
};

export default function ServiceRequestsIndex({ requests, filters }: ServiceRequestsIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('serviceRequests', 'title'), href: '/service-requests' }];

    const statusLabel: Record<ServiceRequestStatusValue, string> = useMemo(
        () => ({
            pending: t('serviceRequests', 'pending'),
            scheduled: t('serviceRequests', 'scheduled'),
            completed: t('serviceRequests', 'completed'),
            cancelled: t('serviceRequests', 'cancelled'),
        }),
        [t],
    );

    const typeLabel: Record<ServiceRequestTypeValue, string> = useMemo(
        () => ({
            installation: t('serviceRequests', 'installation'),
            service: t('serviceRequests', 'service'),
        }),
        [t],
    );

    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const { isLoading, applyFilters, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'service-requests.index',
        filters,
        emptyFilters: { status: null, type: null, from: null, to: null },
    });

    const selection = useTableSelection({
        rows: requests.data,
        getId: (request) => request.id,
    });

    const handleExport = useTableExport({
        routeName: 'service-requests.export',
        filters,
        filterKeys: ['status', 'type', 'from', 'to'],
        selectedIds: selection.selectedIds,
    });

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('date')) ids.push('request_date');
        if (isVisible('invoice')) ids.push('invoice_no');
        if (isVisible('customer')) ids.push('customer');
        if (isVisible('product')) ids.push('product');
        if (isVisible('type')) ids.push('type');
        if (isVisible('charge')) ids.push('charge_amount');
        if (isVisible('status')) ids.push('status');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<ServiceRequestListItem>[]>(
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
                header: t('serviceRequests', 'date'),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.request_date),
            },
            { id: 'invoice', header: t('serviceRequests', 'invoice'), cell: ({ row }) => row.original.invoice_no },
            {
                id: 'customer',
                header: t('serviceRequests', 'customer'),
                cell: ({ row }) => <ContactLink id={row.original.customer.id} name={row.original.customer.name} />,
            },
            {
                id: 'product',
                header: t('serviceRequests', 'product'),
                cell: ({ row }) => (
                    <>
                        {row.original.product.name} <span className="text-muted-foreground">({row.original.product.sku})</span>
                    </>
                ),
            },
            { id: 'type', header: t('serviceRequests', 'type'), cell: ({ row }) => typeLabel[row.original.type] },
            {
                id: 'charge',
                header: t('serviceRequests', 'charge'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) =>
                    row.original.is_free ? (
                        <Badge variant="secondary">{t('serviceRequests', 'free')}</Badge>
                    ) : (
                        money(row.original.charge_amount)
                    ),
            },
            {
                id: 'status',
                header: t('serviceRequests', 'status'),
                cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{statusLabel[row.original.status]}</Badge>,
            },
        ],
        [selection, money, t, typeLabel, statusLabel],
    );

    const renderGridCard = useCallback(
        (request: ServiceRequestListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox
                            checked={selection.isSelected(request.id)}
                            onCheckedChange={(checked) => selection.toggle(request.id, checked)}
                        />
                        <div className="min-w-0">
                            <p className="truncate font-medium">
                                {request.product.name} <span className="text-muted-foreground">({request.product.sku})</span>
                            </p>
                            <div className="text-muted-foreground text-xs">
                                {request.invoice_no} — <ContactLink id={request.customer.id} name={request.customer.name} />
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {request.is_free ? (
                            <Badge variant="secondary">{t('serviceRequests', 'free')}</Badge>
                        ) : (
                            <span className="font-medium tabular-nums">{money(request.charge_amount)}</span>
                        )}
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(request.request_date)} · {typeLabel[request.type]}
                    </span>
                    <Badge variant={statusVariant[request.status]}>{statusLabel[request.status]}</Badge>
                </div>
            </div>
        ),
        [selection, money, t, typeLabel, statusLabel],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('serviceRequests', 'title')} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title={t('serviceRequests', 'title')} description={t('serviceRequests', 'description')} />
                    <Button asChild>
                        <Link href={route('service-requests.create')}>{t('serviceRequests', 'add')}</Link>
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
                    totalCount={requests.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <FormInput
                                id="from"
                                label={t('serviceRequests', 'from')}
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) => applyFilters({ from: e.target.value || null })}
                                className="w-40"
                            />
                            <FormInput
                                id="to"
                                label={t('serviceRequests', 'to')}
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) => applyFilters({ to: e.target.value || null })}
                                className="w-40"
                            />

                            <div className="grid gap-2">
                                <Label htmlFor="type">{t('serviceRequests', 'type')}</Label>
                                <Select
                                    value={filters.type ?? 'all'}
                                    onValueChange={(value) => applyFilters({ type: value === 'all' ? null : (value as ServiceRequestTypeValue) })}
                                >
                                    <SelectTrigger id="type" className="w-40">
                                        <SelectValue placeholder={t('serviceRequests', 'type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('serviceRequests', 'all_types')}</SelectItem>
                                        <SelectItem value="installation">{t('serviceRequests', 'installation')}</SelectItem>
                                        <SelectItem value="service">{t('serviceRequests', 'service')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="status">{t('serviceRequests', 'status')}</Label>
                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(value) =>
                                        applyFilters({ status: value === 'all' ? null : (value as ServiceRequestStatusValue) })
                                    }
                                >
                                    <SelectTrigger id="status" className="w-40">
                                        <SelectValue placeholder={t('serviceRequests', 'status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('serviceRequests', 'all_statuses')}</SelectItem>
                                        <SelectItem value="pending">{t('serviceRequests', 'pending')}</SelectItem>
                                        <SelectItem value="scheduled">{t('serviceRequests', 'scheduled')}</SelectItem>
                                        <SelectItem value="completed">{t('serviceRequests', 'completed')}</SelectItem>
                                        <SelectItem value="cancelled">{t('serviceRequests', 'cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    }
                />

                <DataTable
                    columns={columns}
                    data={requests.data}
                    getRowKey={(request) => request.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title={t('serviceRequests', 'empty_title')} description={t('serviceRequests', 'empty_description')}>
                            <Button className="mt-2" asChild>
                                <Link href={route('service-requests.create')}>{t('serviceRequests', 'add')}</Link>
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title={t('serviceRequests', 'empty_title')} description={t('serviceRequests', 'empty_description')}>
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                {t('common', 'clear_filters')}
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={requests}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="requests"
                        />
                    }
                />
            </div>
        </AppLayout>
    );
}
