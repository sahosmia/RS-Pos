import { getAssetActions } from '@/components/assets/asset-actions';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Label } from '@/components/ui/label';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type AssetListItem, type Paginated } from '@/types/models';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Assets & Liabilities', href: '/assets' }, { title: 'Assets', href: '/assets' }];

/** No `search`/`sort`/dropdown filters here — the backend's `AssetController::index()` doesn't accept any today. */
interface AssetFilters extends TableFilterBase {
    per_page: number | 'all';
}

interface AssetsIndexProps {
    assets: Paginated<AssetListItem>;
    totalValue: number;
    filters: AssetFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'name', label: 'Name' },
    { id: 'category', label: 'Category' },
    { id: 'current_value', label: 'Current Value' },
];

/** Matches `AssetExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'name', label: 'Name' },
    { id: 'category', label: 'Category' },
    { id: 'opening_value', label: 'Opening Value' },
    { id: 'current_value', label: 'Current Value' },
    { id: 'purchase_date', label: 'Purchase Date' },
];

export default function AssetsIndex({ assets, totalValue, filters }: AssetsIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AssetListItem | null>(null);
    const [deleting, setDeleting] = useState<AssetListItem | null>(null);

    const form = useForm({
        name: '',
        category: '',
        purchase_date: '',
        opening_value: 0,
    });

    const { isLoading, applyFilters, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'assets.index',
        filters,
    });

    const selection = useTableSelection({
        rows: assets.data,
        getId: (asset) => asset.id,
    });

    const handleExport = useTableExport({
        routeName: 'assets.export',
        filters,
        selectedIds: selection.selectedIds,
    });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '', category: '', purchase_date: '', opening_value: 0 });
        setEditing(null);
        setModalOpen(true);
    };

    // The header's global "Quick Create" menu links here with `?quick_create=1`
    // since there's no standalone /assets/create page — this opens the same
    // Add Asset modal on arrival instead.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('quick_create') !== '1') return;

        openCreate();
        params.delete('quick_create');
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openEdit = (asset: AssetListItem) => {
        form.clearErrors();
        form.setData({
            name: asset.name,
            category: asset.category ?? '',
            purchase_date: asset.purchase_date ?? '',
            opening_value: asset.opening_value,
        });
        setEditing(asset);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const isEditing = editing !== null;
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEditing ? 'Asset updated.' : 'Asset added.');
                setModalOpen(false);
            },
        };

        if (editing) {
            form.patch(route('assets.update', editing.id), options);
        } else {
            form.post(route('assets.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        const name = deleting.name;

        router.delete(route('assets.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${name}" deleted.`),
            onError: (errors) => toast.error(errors.asset ?? 'Could not delete asset.'),
            onFinish: () => setDeleting(null),
        });
    };

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('name')) ids.push('name');
        if (isVisible('category')) ids.push('category');
        if (isVisible('current_value')) ids.push('current_value');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<AssetListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getAssetActions(row.original, { onEdit: openEdit, onDelete: setDeleting })} />,
            },
            {
                id: 'name',
                header: 'Name',
                cell: ({ row }) => (
                    <Link href={route('assets.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.name}
                    </Link>
                ),
            },
            { id: 'category', header: 'Category', cell: ({ row }) => row.original.category ?? '—' },
            {
                id: 'current_value',
                header: 'Current Value',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.current_value),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [money, selection],
    );

    const renderGridCard = useCallback(
        (asset: AssetListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox checked={selection.isSelected(asset.id)} onCheckedChange={(checked) => selection.toggle(asset.id, checked)} />
                        <div className="min-w-0">
                            <Link href={route('assets.show', asset.id)} className="truncate font-medium underline-offset-2 hover:underline">
                                {asset.name}
                            </Link>
                            <div className="text-muted-foreground text-xs">{asset.category ?? '—'}</div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(asset.current_value)}</span>
                        <DataTableRowActions actions={getAssetActions(asset, { onEdit: openEdit, onDelete: setDeleting })} />
                    </div>
                </div>
            </div>
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [money, selection],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assets" />

            <div className="space-y-6 px-4 py-6">
                <Tabs value="/assets" onValueChange={(url) => router.visit(url)}>
                    <TabsList>
                        <TabsTrigger value="/assets">Assets</TabsTrigger>
                        <TabsTrigger value="/other-liabilities">Other Liabilities</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Assets" description="দোকানের নিজস্ব সম্পদ — ফার্নিচার, গাড়ি, ইকুইপমেন্ট" />
                    <Button onClick={openCreate}>Add Asset</Button>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Total current value</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(totalValue)}</p>
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
                    totalCount={assets.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                />

                <DataTable
                    columns={columns}
                    data={assets.data}
                    getRowKey={(asset) => asset.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title="No assets yet" description="প্রথম asset যোগ করুন">
                            <Button className="mt-2" onClick={openCreate}>
                                Add Asset
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={assets}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="assets"
                        />
                    }
                />
            </div>

            <FormModal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Edit Asset' : 'Add Asset'} processing={form.processing} onSubmit={submit}>
                <FormInput
                    id="name"
                    label="Name"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    error={form.errors.name}
                    required
                />

                <FormInput
                    id="category"
                    label="Category"
                    placeholder="Equipment, Vehicle, Furniture..."
                    value={form.data.category}
                    onChange={(e) => form.setData('category', e.target.value)}
                    error={form.errors.category}
                />

                <FormInput
                    id="purchase_date"
                    label="Purchase Date"
                    type="date"
                    value={form.data.purchase_date}
                    onChange={(e) => form.setData('purchase_date', e.target.value)}
                    error={form.errors.purchase_date}
                />

                <div className="grid gap-2">
                    <Label htmlFor="opening_value">Opening Value</Label>
                    <MoneyInput
                        id="opening_value"
                        value={form.data.opening_value}
                        disabled={editing !== null && !editing.can_edit_opening_value}
                        onChange={(e) => form.setData('opening_value', Number(e.target.value))}
                        required
                    />
                    {editing !== null && !editing.can_edit_opening_value && (
                        <p className="text-muted-foreground text-xs">এই asset-এ লেনদেন হয়ে গেছে — opening value আর বদলানো যাবে না।</p>
                    )}
                    <InputError message={form.errors.opening_value} />
                </div>
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete asset?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
