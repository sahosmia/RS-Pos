import ProductStatusBadge from '@/components/products/product-status-badge';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions, { type RowAction } from '@/components/data-table/data-table-row-actions';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import { type ProductListItem } from '@/types/models';

interface ProductGridCardProps {
    product: ProductListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    actions: RowAction[];
}

/** Rendered by `DataTable` in Grid view — available on any device, not only mobile. */
export default function ProductGridCard({ product, selected, onToggleSelected, actions }: ProductGridCardProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();

    return (
        <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="size-10 shrink-0 rounded-md border object-cover" />
                    ) : (
                        <div className="bg-muted size-10 shrink-0 rounded-md border" />
                    )}
                    <div className="min-w-0">
                        <div className="truncate font-medium">{product.name}</div>
                        <div className="text-muted-foreground text-xs">{product.sku}</div>
                    </div>
                </div>
                <DataTableRowActions actions={actions} />
            </div>

            <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate">
                    {product.category?.name ?? '—'}
                    {product.brand ? ` · ${product.brand.name}` : ''}
                </span>
                <span className="shrink-0 font-medium tabular-nums">{money(product.selling_price)}</span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                    {product.manage_stock
                        ? `${product.current_stock} ${product.unit.name} ${t('productList', 'in_stock_suffix')}`
                        : t('productList', 'service_item')}
                </span>
                <div className="shrink-0">
                    <ProductStatusBadge product={product} />
                </div>
            </div>
        </div>
    );
}
