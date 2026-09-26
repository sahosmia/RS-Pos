import { getWarrantyClaimActions } from '@/components/products/warranty-claim-actions';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import ContactLink from '@/components/shared/contact-link';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { formatDate, today } from '@/lib/format-date';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Paginated, type WarrantyableSaleItem, type WarrantyClaimListItem, type WarrantyClaimStatusValue } from '@/types/models';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { FormEventHandler, useCallback, useMemo, useState } from 'react';

interface WarrantyClaimFilters extends TableFilterBase {
    status: WarrantyClaimStatusValue | null;
    per_page: number | 'all';
}

interface WarrantyClaimsIndexProps {
    claims: Paginated<WarrantyClaimListItem>;
    searchQuery: string;
    searchResults: WarrantyableSaleItem[];
    filters: WarrantyClaimFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'date', label: 'Date' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'product', label: 'Product' },
    { id: 'issue', label: 'Issue' },
    { id: 'status', label: 'Status' },
];

/** Matches `WarrantyClaimExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'claim_date', label: 'Claim Date' },
    { id: 'invoice_no', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'product', label: 'Product' },
    { id: 'warranty_expires_at', label: 'Warranty Expires' },
    { id: 'issue_description', label: 'Issue' },
    { id: 'status', label: 'Status' },
    { id: 'resolution_note', label: 'Resolution Note' },
];

const statusVariant: Record<WarrantyClaimStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    pending: 'outline',
    in_progress: 'outline',
    resolved: 'secondary',
    rejected: 'destructive',
};

export default function WarrantyClaimsIndex({ claims, searchQuery, searchResults, filters }: WarrantyClaimsIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('warrantyClaims', 'title'), href: '/warranty-claims' }];

    const statusLabel: Record<WarrantyClaimStatusValue, string> = useMemo(
        () => ({
            pending: t('warrantyClaims', 'pending'),
            in_progress: t('warrantyClaims', 'in_progress'),
            resolved: t('warrantyClaims', 'resolved'),
            rejected: t('warrantyClaims', 'rejected'),
        }),
        [t],
    );

    const statusOptions = [
        { value: 'pending', label: statusLabel.pending },
        { value: 'in_progress', label: statusLabel.in_progress },
        { value: 'resolved', label: statusLabel.resolved },
        { value: 'rejected', label: statusLabel.rejected },
    ];

    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [addOpen, setAddOpen] = useState(false);
    const [search, setSearch] = useState(searchQuery);
    const [selected, setSelected] = useState<WarrantyableSaleItem | null>(null);
    const [editing, setEditing] = useState<WarrantyClaimListItem | null>(null);

    const { isLoading, applyFilters, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'warranty-claims.index',
        filters,
        emptyFilters: { status: null },
    });

    const selection = useTableSelection({
        rows: claims.data,
        getId: (claim) => claim.id,
    });

    const handleExport = useTableExport({
        routeName: 'warranty-claims.export',
        filters,
        filterKeys: ['status'],
        selectedIds: selection.selectedIds,
    });

    const addForm = useForm({ sale_item_id: 0, claim_date: today(), issue_description: '' });
    const editForm = useForm({ status: 'pending' as WarrantyClaimStatusValue, resolution_note: '' });

    const runSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('warranty-claims.index'),
            { q: search },
            { preserveState: true, preserveScroll: true, only: ['searchResults', 'searchQuery'] },
        );
    };

    const openAdd = () => {
        setSelected(null);
        addForm.reset();
        setSearch('');
        setAddOpen(true);
    };

    const submitAdd: FormEventHandler = (e) => {
        e.preventDefault();
        addForm.post(route('warranty-claims.store'), { preserveScroll: true, onSuccess: () => setAddOpen(false) });
    };

    const openEdit = useCallback(
        (claim: WarrantyClaimListItem) => {
            editForm.clearErrors();
            editForm.setData({ status: claim.status, resolution_note: claim.resolution_note ?? '' });
            setEditing(claim);
        },
        [editForm],
    );

    const submitEdit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!editing) {
            return;
        }

        editForm.patch(route('warranty-claims.update', editing.id), { preserveScroll: true, onSuccess: () => setEditing(null) });
    };

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('date')) ids.push('claim_date');
        if (isVisible('invoice')) ids.push('invoice_no');
        if (isVisible('customer')) ids.push('customer');
        if (isVisible('product')) ids.push('product');
        if (isVisible('issue')) ids.push('issue_description');
        if (isVisible('status')) ids.push('status');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<WarrantyClaimListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getWarrantyClaimActions(row.original, { onUpdate: openEdit })} />,
            },
            {
                id: 'date',
                header: t('warrantyClaims', 'date'),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.claim_date),
            },
            { id: 'invoice', header: t('warrantyClaims', 'invoice'), cell: ({ row }) => row.original.invoice_no },
            {
                id: 'customer',
                header: t('warrantyClaims', 'customer'),
                cell: ({ row }) => <ContactLink id={row.original.customer.id} name={row.original.customer.name} />,
            },
            {
                id: 'product',
                header: t('warrantyClaims', 'product'),
                cell: ({ row }) => (
                    <>
                        {row.original.product.name} <span className="text-muted-foreground">({row.original.product.sku})</span>
                    </>
                ),
            },
            {
                id: 'issue',
                header: t('warrantyClaims', 'issue'),
                meta: { cellClassName: 'max-w-xs' },
                cell: ({ row }) => row.original.issue_description,
            },
            {
                id: 'status',
                header: t('warrantyClaims', 'status'),
                cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{statusLabel[row.original.status]}</Badge>,
            },
        ],
        [selection, openEdit, t, statusLabel],
    );

    const renderGridCard = useCallback(
        (claim: WarrantyClaimListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox checked={selection.isSelected(claim.id)} onCheckedChange={(checked) => selection.toggle(claim.id, checked)} />
                        <div className="min-w-0">
                            <p className="truncate font-medium">
                                {claim.product.name} <span className="text-muted-foreground">({claim.product.sku})</span>
                            </p>
                            <div className="text-muted-foreground text-xs">
                                {claim.invoice_no} — <ContactLink id={claim.customer.id} name={claim.customer.name} />
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <Badge variant={statusVariant[claim.status]}>{statusLabel[claim.status]}</Badge>
                        <DataTableRowActions actions={getWarrantyClaimActions(claim, { onUpdate: openEdit })} />
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(claim.claim_date)}</span>
                    <span className="truncate text-xs">{claim.issue_description}</span>
                </div>
            </div>
        ),
        [selection, openEdit, statusLabel],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('warrantyClaims', 'title')} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title={t('warrantyClaims', 'title')} description={t('warrantyClaims', 'description')} />
                    <Button onClick={openAdd}>{t('warrantyClaims', 'add')}</Button>
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
                    totalCount={claims.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="status">{t('warrantyClaims', 'status')}</Label>
                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(value) => applyFilters({ status: value === 'all' ? null : (value as WarrantyClaimStatusValue) })}
                                >
                                    <SelectTrigger id="status" className="w-48">
                                        <SelectValue placeholder={t('warrantyClaims', 'status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('warrantyClaims', 'all_statuses')}</SelectItem>
                                        <SelectItem value="pending">{t('warrantyClaims', 'pending')}</SelectItem>
                                        <SelectItem value="in_progress">{t('warrantyClaims', 'in_progress')}</SelectItem>
                                        <SelectItem value="resolved">{t('warrantyClaims', 'resolved')}</SelectItem>
                                        <SelectItem value="rejected">{t('warrantyClaims', 'rejected')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    }
                />

                <DataTable
                    columns={columns}
                    data={claims.data}
                    getRowKey={(claim) => claim.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title={t('warrantyClaims', 'empty_title')} description={t('warrantyClaims', 'empty_description')}>
                            <Button className="mt-2" onClick={openAdd}>
                                {t('warrantyClaims', 'add')}
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title={t('warrantyClaims', 'empty_title')} description={t('warrantyClaims', 'empty_description')}>
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                {t('common', 'clear_filters')}
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={claims}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="claims"
                        />
                    }
                />
            </div>

            <FormModal
                open={addOpen}
                onOpenChange={setAddOpen}
                title={t('warrantyClaims', 'add_title')}
                submitLabel={t('warrantyClaims', 'add')}
                processing={addForm.processing}
                onSubmit={submitAdd}
            >
                {!selected ? (
                    <div className="space-y-3">
                        <form onSubmit={runSearch} className="flex gap-2">
                            <FormInput
                                id="search"
                                placeholder={t('serviceRequests', 'search_placeholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" variant="outline">
                                {t('serviceRequests', 'search')}
                            </Button>
                        </form>

                        <div className="max-h-64 space-y-1 overflow-y-auto">
                            {searchResults.length === 0 && (
                                <p className="text-muted-foreground py-4 text-center text-sm">
                                    {search ? t('serviceRequests', 'no_results') : t('serviceRequests', 'start_searching')}
                                </p>
                            )}
                            {searchResults.map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => {
                                        setSelected(item);
                                        addForm.setData('sale_item_id', item.id);
                                    }}
                                    className="hover:bg-accent flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
                                >
                                    <span>
                                        {item.product.name} ({item.product.sku}) — {item.invoice_no}, {item.customer.name}
                                    </span>
                                    {item.warranty_expires_at && (
                                        <span className="text-muted-foreground text-xs">
                                            {t('warrantyClaims', 'warranty_till')} {formatDate(item.warranty_expires_at)}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="rounded-md border p-2 text-sm">
                            <p className="font-medium">
                                {selected.product.name} ({selected.product.sku})
                            </p>
                            <p className="text-muted-foreground">
                                {selected.invoice_no} — {selected.customer.name}
                                {selected.warranty_expires_at &&
                                    ` — ${t('warrantyClaims', 'warranty_till')} ${formatDate(selected.warranty_expires_at)}`}
                            </p>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                                {t('serviceRequests', 'choose_different_item')}
                            </Button>
                        </div>

                        <FormInput
                            id="claim_date"
                            label={t('warrantyClaims', 'claim_date')}
                            type="date"
                            value={addForm.data.claim_date}
                            onChange={(e) => addForm.setData('claim_date', e.target.value)}
                            error={addForm.errors.claim_date}
                            required
                        />

                        <div className="grid gap-2">
                            <Label htmlFor="issue_description">{t('warrantyClaims', 'issue')}</Label>
                            <Textarea
                                id="issue_description"
                                value={addForm.data.issue_description}
                                onChange={(e) => addForm.setData('issue_description', e.target.value)}
                                rows={3}
                                required
                            />
                            <InputError message={addForm.errors.issue_description} />
                        </div>
                    </>
                )}
            </FormModal>

            <FormModal
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
                title={t('warrantyClaims', 'update_title')}
                submitLabel={t('common', 'save')}
                processing={editForm.processing}
                onSubmit={submitEdit}
            >
                <FormSelect
                    id="status"
                    label={t('warrantyClaims', 'status')}
                    value={editForm.data.status}
                    onChange={(val) => val && editForm.setData('status', val as WarrantyClaimStatusValue)}
                    options={statusOptions}
                    error={editForm.errors.status}
                />

                <div className="grid gap-2">
                    <Label htmlFor="resolution_note">{t('warrantyClaims', 'resolution_note')}</Label>
                    <Textarea
                        id="resolution_note"
                        value={editForm.data.resolution_note}
                        onChange={(e) => editForm.setData('resolution_note', e.target.value)}
                        rows={3}
                    />
                    <InputError message={editForm.errors.resolution_note} />
                </div>
            </FormModal>
        </AppLayout>
    );
}
