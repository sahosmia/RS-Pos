import { getEmiInstallmentActions } from '@/components/sales/emi-installment-actions';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import ContactLink from '@/components/shared/contact-link';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Label } from '@/components/ui/label';
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
import { type Account, type EmiInstallmentListItem, type EmiInstallmentStatusValue, type Paginated } from '@/types/models';
import { Head, useForm, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { FormEventHandler, useCallback, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'EMI Installments', href: '/emi-installments' }];

/** No `sort` here — `EmiInstallmentController::index()` doesn't accept it today. */
interface EmiInstallmentFilters extends TableFilterBase {
    status: EmiInstallmentStatusValue | null;
    search: string | null;
    per_page: number | 'all';
}

interface EmiInstallmentsIndexProps {
    installments: Paginated<EmiInstallmentListItem>;
    accounts: Account[];
    filters: EmiInstallmentFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'invoice', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'number', label: '#' },
    { id: 'due_date', label: 'Due Date' },
    { id: 'amount', label: 'Amount' },
    { id: 'paid', label: 'Paid' },
    { id: 'status', label: 'Status' },
];

/** Matches `EmiInstallmentExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'invoice_no', label: 'Invoice No' },
    { id: 'customer', label: 'Customer' },
    { id: 'installment_number', label: 'Installment #' },
    { id: 'due_date', label: 'Due Date' },
    { id: 'amount', label: 'Amount' },
    { id: 'paid_amount', label: 'Paid' },
    { id: 'status', label: 'Status' },
];

const statusVariant: Record<EmiInstallmentStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    pending: 'outline',
    paid: 'secondary',
    overdue: 'destructive',
    cancelled: 'destructive',
};

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function EmiInstallmentsIndex({ installments, accounts, filters }: EmiInstallmentsIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [paying, setPaying] = useState<EmiInstallmentListItem | null>(null);

    const { search, setSearch, isLoading, isSearching, applyFilters, submitSearchNow, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'emi-installments.index',
        filters,
        emptyFilters: { status: null, search: null },
    });

    const selection = useTableSelection({
        rows: installments.data,
        getId: (installment) => installment.id,
    });

    const handleExport = useTableExport({
        routeName: 'emi-installments.export',
        filters,
        filterKeys: ['status'],
        selectedIds: selection.selectedIds,
    });

    const payForm = useForm({ account_id: 0, amount: 0 });

    const openPay = useCallback(
        (installment: EmiInstallmentListItem) => {
            payForm.clearErrors();
            payForm.setData({ account_id: accounts[0]?.id ?? 0, amount: installment.amount - installment.paid_amount });
            setPaying(installment);
        },
        [accounts, payForm],
    );

    const submitPay: FormEventHandler = (e) => {
        e.preventDefault();

        if (!paying) {
            return;
        }

        payForm.post(route('emi-installments.pay', paying.id), { preserveScroll: true, onSuccess: () => setPaying(null) });
    };

    const accountOptions = accounts.map((account) => ({ value: String(account.id), label: account.name }));

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('invoice')) ids.push('invoice_no');
        if (isVisible('customer')) ids.push('customer');
        if (isVisible('number')) ids.push('installment_number');
        if (isVisible('due_date')) ids.push('due_date');
        if (isVisible('amount')) ids.push('amount');
        if (isVisible('paid')) ids.push('paid_amount');
        if (isVisible('status')) ids.push('status');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<EmiInstallmentListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getEmiInstallmentActions(row.original, { onPay: openPay })} />,
            },
            { id: 'invoice', header: 'Invoice', cell: ({ row }) => row.original.invoice_no },
            {
                id: 'customer',
                header: 'Customer',
                cell: ({ row }) => <ContactLink id={row.original.customer.id} name={row.original.customer.name} />,
            },
            {
                id: 'number',
                header: '#',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => row.original.installment_number,
            },
            {
                id: 'due_date',
                header: 'Due Date',
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.due_date),
            },
            {
                id: 'amount',
                header: 'Amount',
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
                header: 'Status',
                cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{humanize(row.original.status)}</Badge>,
            },
        ],
        [money, selection, openPay],
    );

    const renderGridCard = useCallback(
        (installment: EmiInstallmentListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox
                            checked={selection.isSelected(installment.id)}
                            onCheckedChange={(checked) => selection.toggle(installment.id, checked)}
                        />
                        <div className="min-w-0">
                            <p className="truncate font-medium">
                                {installment.invoice_no} · #{installment.installment_number}
                            </p>
                            <div className="text-muted-foreground text-xs">
                                <ContactLink id={installment.customer.id} name={installment.customer.name} />
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(installment.amount)}</span>
                        <DataTableRowActions actions={getEmiInstallmentActions(installment, { onPay: openPay })} />
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(installment.due_date)}
                        {installment.paid_amount > 0 && ` · Paid ${money(installment.paid_amount)}`}
                    </span>
                    <Badge variant={statusVariant[installment.status]}>{humanize(installment.status)}</Badge>
                </div>
            </div>
        ),
        [money, selection, openPay],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="EMI Installments" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="EMI Installments" description="সব বিক্রির কিস্তির সময়সূচি ও পেমেন্ট" />

                <DataTableToolbar
                    search={search}
                    onSearchChange={setSearch}
                    onSearchSubmit={submitSearchNow}
                    isSearching={isSearching}
                    searchPlaceholder="Invoice no বা customer name..."
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
                    totalCount={installments.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(value) =>
                                        applyFilters({ status: value === 'all' ? null : (value as EmiInstallmentStatusValue) })
                                    }
                                >
                                    <SelectTrigger id="status" className="w-48">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    }
                />

                <DataTable
                    columns={columns}
                    data={installments.data}
                    getRowKey={(installment) => installment.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={<EmptyState title="No installments yet" description="কোনো installment নেই" />}
                    filteredEmptyState={
                        <EmptyState title="No installments match your filters" description="অন্য filter দিয়ে আবার চেষ্টা করুন" />
                    }
                    footer={
                        <DataTablePagination
                            pagination={installments}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="installments"
                        />
                    }
                />
            </div>

            <FormModal
                open={paying !== null}
                onOpenChange={(open) => !open && setPaying(null)}
                title={`Pay Installment #${paying?.installment_number ?? ''}`}
                description={paying ? `${paying.invoice_no} — ${paying.customer.name}` : undefined}
                submitLabel="Record Payment"
                processing={payForm.processing}
                onSubmit={submitPay}
            >
                <FormSelect
                    id="account_id"
                    label="Account"
                    value={payForm.data.account_id}
                    onChange={(val) => val && payForm.setData('account_id', Number(val))}
                    options={accountOptions}
                    error={payForm.errors.account_id}
                />

                <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <MoneyInput id="amount" value={payForm.data.amount} onChange={(e) => payForm.setData('amount', Number(e.target.value))} />
                    <InputError message={payForm.errors.amount} />
                </div>
            </FormModal>
        </AppLayout>
    );
}
