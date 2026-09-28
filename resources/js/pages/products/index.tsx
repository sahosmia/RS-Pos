import DataTable from '@/components/data-table/data-table';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { getProductActions } from '@/components/products/product-actions';
import ProductFilters from '@/components/products/product-filters';
import ProductGridCard from '@/components/products/product-grid-card';
import ProductStatCards from '@/components/products/product-stat-cards';
import StockAdjustmentModal from '@/components/products/stock-adjustment-modal';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { useTableExport } from '@/hooks/table/use-table-export';
import { useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useTranslation } from '@/hooks/use-translation';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type ProductListItem } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type VisibilityState } from '@tanstack/react-table';
import { Package, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getExportColumns, getVisibilityColumns, useProductColumns } from './table/columns';
import { type ProductsIndexProps } from './types';

export default function ProductsIndex({ products, stats, categories, brands, filters }: ProductsIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('productsPage', 'title'), href: '/products' }];

    const [adjusting, setAdjusting] = useState<ProductListItem | null>(null);
    const [deleting, setDeleting] = useState<ProductListItem | null>(null);
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const {
        search,
        setSearch,
        isLoading,
        isSearching,
        applyFilters,
        submitSearchNow,
        handleSort,
        activeFilterCount,
        canReset,
        resetFilters,
    } = useTableFilters({
        routeName: 'products.index',
        filters,
        emptyFilters: { category_id: null, brand_id: null, stock_status: null, preset: null, from: null, to: null },
    });

    const selection = useTableSelection({
        rows: products.data,
        getId: (product) => product.id,
    });

    const handleExport = useTableExport({
        routeName: 'products.export',
        filters,
        filterKeys: ['category_id', 'brand_id', 'stock_status'],
        selectedIds: selection.selectedIds,
    });

    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];
        if (isVisible('product')) ids.push('name', 'sku');
        if (isVisible('category')) ids.push('category', 'brand');
        if (isVisible('stock')) ids.push('stock');
        if (isVisible('price')) ids.push('price');
        if (isVisible('margin')) ids.push('margin');
        if (isVisible('status')) ids.push('status');
        return ids;
    }, [columnVisibility]);

    const confirmDelete = () => {
        if (!deleting) return;
        const name = deleting.name;
        router.delete(route('products.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${name}" ${t('productsPage', 'deleted_toast')}`),
            onError: (errors) => toast.error(errors.product ?? t('productsPage', 'delete_error')),
            onFinish: () => setDeleting(null),
        });
    };

    const columns = useProductColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: handleSort,
        selection,
        onAdjustStock: setAdjusting,
        onDelete: setDeleting,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('productsPage', 'title')} />

            <div className="space-y-6 px-4 py-6">
                {/* ───────────── Page header ───────────── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400">
                            <Package className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">{t('productsPage', 'title')}</h1>
                            <p className="text-muted-foreground text-sm">{t('productsPage', 'description')}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <Button asChild className="gap-1.5">
                            <Link href={route('products.create')}>
                                <Plus className="size-4" />
                                {t('productsPage', 'add_product')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {stats && <ProductStatCards stats={stats} />}

                <DataTableToolbar
                    search={search}
                    onSearchChange={setSearch}
                    onSearchSubmit={submitSearchNow}
                    isSearching={isSearching}
                    searchPlaceholder={t('productsPage', 'search_placeholder')}
                    activeFilterCount={activeFilterCount}
                    canReset={canReset}
                    onReset={resetFilters}
                    visibilityColumns={getVisibilityColumns(t)}
                    columnVisibility={columnVisibility}
                    onVisibilityChange={(id, visible) =>
                        setColumnVisibility((current) => ({ ...current, [id]: visible }))
                    }
                    exportColumns={getExportColumns(t)}
                    defaultExportColumns={defaultExportColumns}
                    totalCount={products.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    filterSlot={
                        <ProductFilters
                            categoryId={filters.category_id}
                            brandId={filters.brand_id}
                            stockStatus={filters.stock_status}
                            preset={filters.preset}
                            from={filters.from}
                            to={filters.to}
                            categories={categories}
                            brands={brands}
                            onChange={applyFilters}
                        />
                    }
                />

                <DataTable
                    columns={columns}
                    data={products.data}
                    getRowKey={(product) => product.id}
                    renderGridCard={(product) => (
                        <ProductGridCard
                            product={product}
                            selected={selection.isSelected(product.id)}
                            onToggleSelected={(checked) => selection.toggle(product.id, checked)}
                            actions={getProductActions(product, { onAdjustStock: setAdjusting, onDelete: setDeleting })}
                        />
                    )}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState
                            title={t('productsPage', 'empty_title')}
                            description={t('productsPage', 'empty_description')}
                        >
                            <Button className="mt-2 gap-1.5" asChild>
                                <Link href={route('products.create')}>
                                    <Plus className="size-4" />
                                    {t('productsPage', 'add_product')}
                                </Link>
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState
                            title={t('common', 'no_results_title')}
                            description={t('common', 'no_results_description')}
                        >
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                {t('common', 'clear_filters')}
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={products}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel={t('productsPage', 'item_label')}
                        />
                    }
                />
            </div>

            <StockAdjustmentModal product={adjusting} onOpenChange={(open) => !open && setAdjusting(null)} />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={t('productsPage', 'delete_title')}
                description={`"${deleting?.name}" ${t('productsPage', 'delete_description')}`}
                confirmLabel={t('common', 'delete')}
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
