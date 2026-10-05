import ProductStatusBadge from '@/components/products/product-status-badge';
import StockQuantity from '@/components/products/stock-quantity';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions, { type RowAction } from '@/components/data-table/data-table-row-actions';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { type ProductListItem } from '@/types/models';
import { Link } from '@inertiajs/react';
import { Package } from 'lucide-react';

interface ProductGridCardProps {
    product: ProductListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    actions: RowAction[];
}

/** Rendered by `DataTable` in Grid view — styled with contacts list grid language. */
export default function ProductGridCard({ product, selected, onToggleSelected, actions }: ProductGridCardProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();

    const isLowStock = product.manage_stock && product.current_stock <= product.minimum_stock_level;
    const isOutOfStock = product.manage_stock && product.current_stock <= 0;

    const accentBorder = isOutOfStock
        ? 'border-l-rose-500'
        : isLowStock
          ? 'border-l-amber-500'
          : 'border-l-emerald-500';

    return (
        <div
            className={cn(
                'group rounded-xl border border-l-4 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md',
                accentBorder,
                selected && 'border-primary/40 bg-primary/5 ring-1 ring-primary/20',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} className="mt-1" />
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="size-11 shrink-0 rounded-lg border object-cover ring-1 ring-border/50" />
                    ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400">
                            <Package className="size-5" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <Link
                            href={route('products.show', product.id)}
                            className="block truncate font-medium underline-offset-2 hover:underline"
                        >
                            {product.name}
                        </Link>
                        {product.sku && <div className="text-muted-foreground truncate font-mono text-xs">{product.sku}</div>}
                        <div className="text-muted-foreground truncate text-xs">
                            {product.category?.name ?? '—'}
                            {product.brand ? ` · ${product.brand.name}` : ''}
                        </div>
                    </div>
                </div>
                <DataTableRowActions actions={actions} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <span className="text-muted-foreground text-xs font-medium">
                    {product.manage_stock ? (
                        <>
                            <StockQuantity product={product} /> {t('productList', 'in_stock_suffix')}
                        </>
                    ) : (
                        t('productList', 'service_item')
                    )}
                </span>
                <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums text-foreground">{money(product.selling_price)}</span>
                    <ProductStatusBadge product={product} hideStockStatus />
                </div>
            </div>
        </div>
    );
}
