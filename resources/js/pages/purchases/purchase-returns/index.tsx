import { getPurchaseReturnActions } from '@/components/purchases/purchase-return-actions';
import EmptyState from '@/components/shared/empty-state';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import ContactLink from '@/components/shared/contact-link';
import { Button } from '@/components/ui/button';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase, useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Paginated, type PurchaseReturnListItem } from '@/types/models';
import { Head, Link, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Purchase Returns', href: '/purchase-returns' }];

interface PurchaseReturnFilters extends TableFilterBase {
    from: string | null;
    to: string | null;
    per_page: number | 'all';
}

interface PurchaseReturnsIndexProps {
    returns: Paginated<PurchaseReturnListItem>;
    filters: PurchaseReturnFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'date', label: 'Date' },
    { id: 'purchase', label: 'Purchase' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'amount', label: 'Amount' },
];

/** Matches `PurchaseReturnExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'invoice_no', label: 'Purchase Invoice No' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'return_date', label: 'Return Date' },
    { id: 'total_amount', label: 'Amount' },
    { id: 'reason', label: 'Reason' },
];

export default function PurchaseReturnsIndex({ returns, filters }: PurchaseReturnsIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const { isLoading, applyFilters, handleSort, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'purchase-returns.index',
        filters,
        emptyFilters: { from: null, to: null },
    });

    const selection = useTableSelection({
        rows: returns.data,
        getId: (purchaseReturn) => purchaseReturn.id,
    });

    const handleExport = useTableExport({
        routeName: 'purchase-returns.export',
        filters,
        filterKeys: ['from', 'to'],
        selectedIds: selection.selectedIds,
    });

    // Table-column visibility → which fine-grained export columns should start checked.
    // `reason` has no table column of its own, so it always starts checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('purchase')) ids.push('invoice_no');
        if (isVisible('supplier')) ids.push('supplier');
        if (isVisible('date')) ids.push('return_date');
        if (isVisible('amount')) ids.push('total_amount');
        ids.push('reason');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<PurchaseReturnListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getPurchaseReturnActions(row.original)} />,
            },
            {
                id: 'date',
                header: () => (
                    <DataTableColumnHeader
                        title="Date"
                        sortKey="return_date"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                    />
                ),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => row.original.return_date,
            },
            {
                id: 'purchase',
                header: 'Purchase',
                cell: ({ row }) => (
                    <Link href={route('purchase-returns.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.purchase.invoice_no}
                    </Link>
                ),
            },
            {
                id: 'supplier',
                header: 'Supplier',
                cell: ({ row }) => <ContactLink id={row.original.supplier.id} name={row.original.supplier.name} />,
            },
            {
                id: 'amount',
                header: () => (
                    <DataTableColumnHeader
                        title="Amount"
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
        ],
        [money, selection, filters.sort, filters.direction, handleSort],
    );

    const renderGridCard = useCallback(
        (purchaseReturn: PurchaseReturnListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox
                            checked={selection.isSelected(purchaseReturn.id)}
                            onCheckedChange={(checked) => selection.toggle(purchaseReturn.id, checked)}
                        />
                        <div className="min-w-0">
                            <Link
                                href={route('purchase-returns.show', purchaseReturn.id)}
                                className="truncate font-medium underline-offset-2 hover:underline"
                            >
                                {purchaseReturn.purchase.invoice_no}
                            </Link>
                            <div className="text-muted-foreground text-xs">
                                <ContactLink id={purchaseReturn.supplier.id} name={purchaseReturn.supplier.name} />
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(purchaseReturn.total_amount)}</span>
                        <DataTableRowActions actions={getPurchaseReturnActions(purchaseReturn)} />
                    </div>
                </div>

                <div className="mt-2 text-muted-foreground text-xs whitespace-nowrap">{purchaseReturn.return_date}</div>
            </div>
        ),
        [money, selection],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchase Returns" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Purchase Returns" description="নির্দিষ্ট Purchase-এর detail page থেকে নতুন return তৈরি করা যায়" />

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
                    totalCount={returns.total}
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
                        </div>
                    }
                />

                <DataTable
                    columns={columns}
                    data={returns.data}
                    getRowKey={(purchaseReturn) => purchaseReturn.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState
                            title="No purchase returns yet"
                            description="একটা received purchase-এর detail page থেকে Return বাটনে ক্লিক করুন"
                        />
                    }
                    filteredEmptyState={
                        <EmptyState title="No purchase returns match your filters" description="অন্য date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={returns}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="returns"
                        />
                    }
                />
            </div>
        </AppLayout>
    );
}
