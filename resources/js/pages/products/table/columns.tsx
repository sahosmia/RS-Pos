import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getProductActions } from '@/components/products/product-actions';
import { ProductImage } from '@/components/products/product-image';
import ProductStatusBadge from '@/components/products/product-status-badge';
import StockQuantity from '@/components/products/stock-quantity';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import { type Dictionary } from '@/lib/translations/en';
import { type ProductListItem } from '@/types/models';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { type ProductSortField } from '../types';

interface UseProductColumnsOptions {
    sort: ProductSortField;
    direction: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: {
        isSelected: (id: number) => boolean;
        toggle: (id: number, checked: boolean) => void;
        toggleAll: (checked: boolean) => void;
        isAllSelected: boolean;
        isSomeSelected: boolean;
    };
    onAdjustStock: (product: ProductListItem) => void;
    onDelete: (product: ProductListItem) => void;
}

/** The Table view's toggleable columns (Product bundles name+sku+image, so it's coarser than the export columns below). */
export const getVisibilityColumns = (t: <S extends keyof Dictionary>(section: S, key: keyof Dictionary[S]) => string): DataTableColumnOption[] => [
    { id: 'product', label: t('productColumns', 'product') },
    { id: 'category', label: t('productColumns', 'category_brand') },
    { id: 'stock', label: t('productColumns', 'stock') },
    { id: 'pap', label: t('productColumns', 'pap') },
    { id: 'tpp', label: t('productColumns', 'tpp') },
    { id: 'price', label: t('productColumns', 'price') },
    { id: 'margin', label: t('productColumns', 'margin') },
    { id: 'status', label: t('productColumns', 'status') },
];

/** Fine-grained export columns — matches `ProductExportController::COLUMN_LABELS` on the backend. */
export const getExportColumns = (t: <S extends keyof Dictionary>(section: S, key: keyof Dictionary[S]) => string): DataTableColumnOption[] => [
    { id: 'name', label: t('common', 'name') },
    { id: 'sku', label: t('productColumns', 'sku') },
    { id: 'barcode', label: t('productColumns', 'barcode') },
    { id: 'category', label: t('nav', 'category') },
    { id: 'brand', label: t('nav', 'brand') },
    { id: 'stock', label: t('productColumns', 'stock') },
    { id: 'pap', label: t('productColumns', 'pap') },
    { id: 'tpp', label: t('productColumns', 'tpp') },
    { id: 'price', label: t('productColumns', 'price') },
    { id: 'margin', label: t('productColumns', 'margin_percent') },
    { id: 'status', label: t('productColumns', 'status') },
];

/** Column definitions for the Products table — kept next to the page, not inside the generic DataTable. */
export function useProductColumns({ sort, direction, onSort, selection, onAdjustStock, onDelete }: UseProductColumnsOptions) {
    const money = useMoneyFormat();
    const { t } = useTranslation();

    return useMemo<ColumnDef<ProductListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getProductActions(row.original, { onAdjustStock, onDelete })} />,
            },
            {
                id: 'product',
                header: () => (
                    <DataTableColumnHeader
                        title={t('productColumns', 'product')}
                        sortKey="name"
                        currentSort={sort}
                        currentDirection={direction}
                        onSort={onSort}
                    />
                ),
                meta: { label: t('productColumns', 'product') },
                cell: ({ row }) => {
                    const product = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <ProductImage src={product.image_url} alt={product.name} className="size-10 rounded-md border object-cover" />
                            <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-muted-foreground text-xs">{product.sku}</div>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'category',
                header: t('productColumns', 'category_brand'),
                meta: { label: t('productColumns', 'category_brand') },
                cell: ({ row }) => (
                    <div>
                        <div>{row.original.category?.name ?? '—'}</div>
                        {row.original.brand && <div className="text-muted-foreground text-xs">{row.original.brand.name}</div>}
                    </div>
                ),
            },
            {
                id: 'stock',
                header: () => (
                    <DataTableColumnHeader
                        title={t('productColumns', 'stock')}
                        sortKey="current_stock"
                        currentSort={sort}
                        currentDirection={direction}
                        onSort={onSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums', label: t('productColumns', 'stock') },
                cell: ({ row }) => <StockQuantity product={row.original} />,
            },
            {
                id: 'pap',
                header: () => (
                    <DataTableColumnHeader
                        title={t('productColumns', 'pap')}
                        sortKey="avg_cost"
                        currentSort={sort}
                        currentDirection={direction}
                        onSort={onSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums', label: t('productColumns', 'pap') },
                cell: ({ row }) => money(row.original.avg_cost),
            },
            {
                id: 'tpp',
                header: t('productColumns', 'tpp'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums', label: t('productColumns', 'tpp') },
                cell: ({ row }) => (row.original.manage_stock ? money(row.original.avg_cost * row.original.current_stock) : '—'),
            },
            {
                id: 'price',
                header: () => (
                    <DataTableColumnHeader
                        title={t('productColumns', 'price')}
                        sortKey="selling_price"
                        currentSort={sort}
                        currentDirection={direction}
                        onSort={onSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums', label: t('productColumns', 'price') },
                cell: ({ row }) => money(row.original.selling_price),
            },
            {
                id: 'margin',
                header: t('productColumns', 'margin'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums', label: t('productColumns', 'margin') },
                cell: ({ row }) => `${row.original.profit_margin}%`,
            },
            {
                id: 'status',
                header: t('productColumns', 'status'),
                meta: { label: t('productColumns', 'status') },
                cell: ({ row }) => <ProductStatusBadge product={row.original} hideStockStatus />,
            },
        ],
        [selection, onAdjustStock, onDelete, sort, direction, onSort, money, t],
    );
}
