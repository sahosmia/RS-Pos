import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { FormInput } from '@/components/form/form-input';
import AddSalePaymentModal from '@/components/sales/add-sale-payment-modal';
import { getSaleActions } from '@/components/sales/sale-actions';
import ViewSalePaymentsModal from '@/components/sales/view-sale-payments-modal';
import ContactLink from '@/components/shared/contact-link';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import SearchableSelect from '@/components/shared/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTableExport } from '@/hooks/table/use-table-export';
import { useTableFilters, type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format-date';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Account, type CustomerOption, type Paginated, type PaymentStatusValue, type SaleListItem, type SaleStatusValue } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarRange } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getExportColumns, getVisibilityColumns, humanize, paymentStatusColor, statusColor, useSaleColumns } from './table/columns';
import { type VisibilityState } from '@tanstack/react-table';

type DatePreset = 'today' | 'yesterday' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

const datePresetLabels: Record<DatePreset, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    last_year: 'Last Year',
};

/** Local-date "YYYY-MM-DD" for query params — avoids the off-by-one day `toISOString()` causes by converting to UTC first. */
const toQueryDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function datePresetRange(preset: DatePreset): { from: Date; to: Date } {
    const today = new Date();

    switch (preset) {
        case 'today':
            return { from: today, to: today };
        case 'yesterday': {
            const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
            return { from: yesterday, to: yesterday };
        }
        case 'this_month':
            return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
        case 'last_month':
            return {
                from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
                to: new Date(today.getFullYear(), today.getMonth(), 0),
            };
        case 'this_year':
            return { from: new Date(today.getFullYear(), 0, 1), to: today };
        case 'last_year':
            return { from: new Date(today.getFullYear() - 1, 0, 1), to: new Date(today.getFullYear() - 1, 11, 31) };
    }
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales', href: '/sales' }];

/** No `sort` here — the backend's `SaleController::index()` doesn't accept it today. */
interface SaleFilters extends TableFilterBase {
    from: string | null;
    to: string | null;
    customer_id: number | null;
    status: SaleStatusValue | null;
    payment_status: PaymentStatusValue | null;
    per_page: number | 'all';
}

interface SalesIndexProps {
    sales: Paginated<SaleListItem>;
    accounts: Account[];
    /** The currently-filtered customer's own label, or `null` when no customer filter is active. */
    initialCustomer: CustomerOption | null;
    filters: SaleFilters;
}

export default function SalesIndex({ sales, accounts, initialCustomer, filters }: SalesIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [deleting, setDeleting] = useState<SaleListItem | null>(null);
    const [addingPayment, setAddingPayment] = useState<SaleListItem | null>(null);
    const [viewingPayments, setViewingPayments] = useState<SaleListItem | null>(null);

    // `initialCustomer` comes from the server on every filtered request (this page reuses one
    // instance via `preserveState`, so a prop change alone wouldn't otherwise re-sync local state).
    useEffect(() => {
        setCustomer(initialCustomer);
    }, [initialCustomer]);

    const { search, setSearch, isLoading, isSearching, submitSearchNow, applyFilters, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'sales.index',
        filters,
        emptyFilters: { from: null, to: null, customer_id: null, status: null, payment_status: null },
    });

    const selection = useTableSelection({
        rows: sales.data,
        getId: (sale) => sale.id,
    });

    const handleExport = useTableExport({
        routeName: 'sales.export',
        filters,
        filterKeys: ['search', 'from', 'to', 'customer_id', 'status', 'payment_status'],
        selectedIds: selection.selectedIds,
    });

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        const invoiceNo = deleting.invoice_no;

        router.delete(route('sales.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${invoiceNo}" deleted.`),
            onError: (errors) => toast.error(errors.sale ?? 'Could not delete this sale.'),
            onFinish: () => setDeleting(null),
        });
    };

    const applyDatePreset = (preset: DatePreset) => {
        const { from, to } = datePresetRange(preset);
        applyFilters({ from: toQueryDate(from), to: toQueryDate(to) });
    };

    // Table-column visibility → which fine-grained export columns should start checked,
    // so "Export" defaults to what's actually on screen.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('invoice')) ids.push('invoice_no');
        if (isVisible('customer')) ids.push('customer');
        if (isVisible('date')) ids.push('sale_date');
        if (isVisible('total')) ids.push('total_amount');
        if (isVisible('due')) ids.push('due_amount');
        if (isVisible('payment_status')) ids.push('payment_status');
        if (isVisible('status')) ids.push('status');

        return ids;
    }, [columnVisibility]);

    const columns = useSaleColumns({ money, selection, onDelete: setDeleting, onAddPayment: setAddingPayment, onViewPayments: setViewingPayments });

    const renderGridCard = useCallback(
        (sale: SaleListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox checked={selection.isSelected(sale.id)} onCheckedChange={(checked) => selection.toggle(sale.id, checked)} />
                        <div className="min-w-0">
                            <Link href={route('sales.show', sale.id)} className="truncate font-medium underline-offset-2 hover:underline">
                                {sale.invoice_no}
                            </Link>
                            {sale.source === 'imported' && (
                                <Badge variant="outline" className="ml-2">
                                    Historical
                                </Badge>
                            )}
                            <div className="text-muted-foreground text-xs">
                                <ContactLink id={sale.customer.id} name={sale.customer.name} />
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(sale.total_amount)}</span>
                        <DataTableRowActions
                            actions={getSaleActions(sale, { onDelete: setDeleting, onAddPayment: setAddingPayment, onViewPayments: setViewingPayments })}
                        />
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(sale.sale_date)}
                        {sale.due_amount > 0 && ` · Due ${money(sale.due_amount)}`}
                    </span>
                    <div className="flex shrink-0 gap-1">
                        <Badge variant="outline" className={paymentStatusColor[sale.payment_status]}>
                            {humanize(sale.payment_status)}
                        </Badge>
                        <Badge variant="outline" className={statusColor[sale.status]}>
                            {humanize(sale.status)}
                        </Badge>
                    </div>
                </div>
            </div>
        ),
        [money, selection],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Sales" description="Draft, Quotation ও Confirmed — একই তালিকা, filter করে দেখুন" />
                    <Button asChild>
                        <Link href={route('sales.create')}>Add Sale</Link>
                    </Button>
                </div>

                <DataTableToolbar
                    search={search}
                    onSearchChange={setSearch}
                    onSearchSubmit={submitSearchNow}
                    isSearching={isSearching}
                    searchPlaceholder="Invoice or customer name"
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
                    totalCount={sales.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" className="gap-2">
                                        <CalendarRange className="size-4" />
                                        Quick Range
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {(Object.keys(datePresetLabels) as DatePreset[]).map((preset) => (
                                        <DropdownMenuItem key={preset} onClick={() => applyDatePreset(preset)}>
                                            {datePresetLabels[preset]}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => applyFilters({ from: null, to: null })}>Clear dates</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

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
                                onValueChange={(value) => applyFilters({ status: value === 'all' ? null : (value as SaleStatusValue) })}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="quotation">Quotation</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
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
                    data={sales.data}
                    getRowKey={(sale) => sale.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title="No sales yet" description="প্রথম sale যোগ করুন">
                            <Button className="mt-2" asChild>
                                <Link href={route('sales.create')}>Add Sale</Link>
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No sales match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={sales}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="sales"
                        />
                    }
                />
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete sale?"
                description={`"${deleting?.invoice_no}" will be permanently deleted.`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />

            {addingPayment && (
                <AddSalePaymentModal
                    open={addingPayment !== null}
                    onOpenChange={(open) => !open && setAddingPayment(null)}
                    sale={addingPayment}
                    accounts={accounts}
                />
            )}

            <ViewSalePaymentsModal
                open={viewingPayments !== null}
                onOpenChange={(open) => !open && setViewingPayments(null)}
                sale={viewingPayments}
            />
        </AppLayout>
    );
}
