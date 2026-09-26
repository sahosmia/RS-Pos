import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import { getPurchaseActions } from '@/components/purchases/purchase-actions';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import ContactLink from '@/components/shared/contact-link';
import EmptyState from '@/components/shared/empty-state';
import SearchableSelect from '@/components/shared/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format-date';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Paginated, type PaymentStatusValue, type PurchaseListItem, type PurchaseStatusValue, type SupplierOption } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Purchases', href: '/purchases' }];

/** No `sort` here — the backend's `PurchaseController::index()` doesn't accept it today. */
interface PurchaseFilters extends TableFilterBase {
    from: string | null;
    to: string | null;
    supplier_id: number | null;
    status: PurchaseStatusValue | null;
    payment_status: PaymentStatusValue | null;
    per_page: number | 'all';
}

interface PurchasesIndexProps {
    purchases: Paginated<PurchaseListItem>;
    /** The currently-filtered supplier's own label, or `null` when no supplier filter is active. */
    initialSupplier: SupplierOption | null;
    filters: PurchaseFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'invoice', label: 'Invoice' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'date', label: 'Date' },
    { id: 'total', label: 'Total' },
    { id: 'due', label: 'Due' },
    { id: 'payment_status', label: 'Payment' },
    { id: 'status', label: 'Status' },
];

/** Matches `PurchaseExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'invoice_no', label: 'Invoice No' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'purchase_date', label: 'Purchase Date' },
    { id: 'total_amount', label: 'Total' },
    { id: 'due_amount', label: 'Due' },
    { id: 'payment_status', label: 'Payment Status' },
    { id: 'status', label: 'Status' },
];

const statusVariant: Record<PurchaseStatusValue, 'secondary' | 'outline' | 'default' | 'destructive'> = {
    draft: 'outline',
    ordered: 'outline',
    received: 'secondary',
    cancelled: 'destructive',
};

const paymentStatusVariant: Record<PaymentStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    due: 'destructive',
    partial: 'outline',
    paid: 'secondary',
};

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function PurchasesIndex({ purchases, initialSupplier, filters }: PurchasesIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [supplier, setSupplier] = useState<SupplierOption | null>(initialSupplier);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [deleting, setDeleting] = useState<PurchaseListItem | null>(null);

    // `initialSupplier` comes from the server on every filtered request (this page reuses one
    // instance via `preserveState`, so a prop change alone wouldn't otherwise re-sync local state).
    useEffect(() => {
        setSupplier(initialSupplier);
    }, [initialSupplier]);

    const { search, setSearch, isLoading, isSearching, submitSearchNow, applyFilters, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'purchases.index',
        filters,
        emptyFilters: { from: null, to: null, supplier_id: null, status: null, payment_status: null },
    });

    const selection = useTableSelection({
        rows: purchases.data,
        getId: (purchase) => purchase.id,
    });

    const handleExport = useTableExport({
        routeName: 'purchases.export',
        filters,
        filterKeys: ['search', 'from', 'to', 'supplier_id', 'status', 'payment_status'],
        selectedIds: selection.selectedIds,
    });

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        const invoiceNo = deleting.invoice_no;

        router.delete(route('purchases.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${invoiceNo}" deleted.`),
            onError: (errors) => toast.error(errors.purchase ?? 'Could not delete this purchase.'),
            onFinish: () => setDeleting(null),
        });
    };

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('invoice')) ids.push('invoice_no');
        if (isVisible('supplier')) ids.push('supplier');
        if (isVisible('date')) ids.push('purchase_date');
        if (isVisible('total')) ids.push('total_amount');
        if (isVisible('due')) ids.push('due_amount');
        if (isVisible('payment_status')) ids.push('payment_status');
        if (isVisible('status')) ids.push('status');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<PurchaseListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getPurchaseActions(row.original, { onDelete: setDeleting })} />,
            },
            {
                id: 'invoice',
                header: 'Invoice',
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
                header: 'Date',
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.purchase_date),
            },
            {
                id: 'total',
                header: 'Total',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_amount),
            },
            {
                id: 'due',
                header: 'Due',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.due_amount),
            },
            {
                id: 'payment_status',
                header: 'Payment',
                cell: ({ row }) => (
                    <Badge variant={paymentStatusVariant[row.original.payment_status]}>{humanize(row.original.payment_status)}</Badge>
                ),
            },
            {
                id: 'status',
                header: 'Status',
                cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{humanize(row.original.status)}</Badge>,
            },
        ],
        [money, selection],
    );

    const renderGridCard = useCallback(
        (purchase: PurchaseListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox
                            checked={selection.isSelected(purchase.id)}
                            onCheckedChange={(checked) => selection.toggle(purchase.id, checked)}
                        />
                        <div className="min-w-0">
                            <Link href={route('purchases.show', purchase.id)} className="truncate font-medium underline-offset-2 hover:underline">
                                {purchase.invoice_no}
                            </Link>
                            <div className="text-muted-foreground text-xs">
                                <ContactLink id={purchase.supplier.id} name={purchase.supplier.name} />
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(purchase.total_amount)}</span>
                        <DataTableRowActions actions={getPurchaseActions(purchase, { onDelete: setDeleting })} />
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(purchase.purchase_date)}
                        {purchase.due_amount > 0 && ` · Due ${money(purchase.due_amount)}`}
                    </span>
                    <div className="flex shrink-0 gap-1">
                        <Badge variant={paymentStatusVariant[purchase.payment_status]}>{humanize(purchase.payment_status)}</Badge>
                        <Badge variant={statusVariant[purchase.status]}>{humanize(purchase.status)}</Badge>
                    </div>
                </div>
            </div>
        ),
        [money, selection],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchases" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Purchases" description="Supplier থেকে কেনা পণ্যের তালিকা" />
                    <Button asChild>
                        <Link href={route('purchases.create')}>Add Purchase</Link>
                    </Button>
                </div>

                <DataTableToolbar
                    search={search}
                    onSearchChange={setSearch}
                    onSearchSubmit={submitSearchNow}
                    isSearching={isSearching}
                    searchPlaceholder="Invoice or supplier name"
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
                    totalCount={purchases.total}
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
                                value={supplier}
                                onChange={(next) => {
                                    setSupplier(next);
                                    applyFilters({ supplier_id: next?.id ?? null });
                                }}
                                getLabel={(option) => option.name}
                                getSublabel={(option) => option.phone ?? ''}
                                searchUrl={route('contacts.search')}
                                searchParams={{ type: 'supplier' }}
                                placeholder="All suppliers"
                                clearable
                            />

                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={(value) => applyFilters({ status: value === 'all' ? null : (value as PurchaseStatusValue) })}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="ordered">Ordered</SelectItem>
                                    <SelectItem value="received">Received</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.payment_status ?? 'all'}
                                onValueChange={(value) => applyFilters({ payment_status: value === 'all' ? null : (value as PaymentStatusValue) })}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Payment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All payments</SelectItem>
                                    <SelectItem value="due">Due</SelectItem>
                                    <SelectItem value="partial">Partial</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                <DataTable
                    columns={columns}
                    data={purchases.data}
                    getRowKey={(purchase) => purchase.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title="No purchases yet" description="প্রথম purchase যোগ করুন">
                            <Button className="mt-2" asChild>
                                <Link href={route('purchases.create')}>Add Purchase</Link>
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No purchases match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={purchases}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="purchases"
                        />
                    }
                />
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete purchase?"
                description={`"${deleting?.invoice_no}" will be permanently deleted.`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
