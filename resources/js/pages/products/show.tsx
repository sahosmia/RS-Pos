import DataTablePagination from '@/components/data-table/data-table-pagination';
import { ProductImage } from '@/components/products/product-image';
import ProductStatusBadge from '@/components/products/product-status-badge';
import StockAdjustmentModal from '@/components/products/stock-adjustment-modal';
import { MetricCard } from '@/components/shared/metric-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Paginated, type ProductListItem, type StockStatus } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    CircleDollarSign,
    History,
    Package,
    Pencil,
    Percent,
    SlidersHorizontal,
    Tag,
    TrendingUp,
    Warehouse,
} from 'lucide-react';
import { useState } from 'react';

interface StockMovementItem {
    id: number;
    type: string;
    type_label: string;
    is_increase: boolean;
    quantity: number;
    unit_cost: number | null;
    total_cost: number | null;
    reference_type: string | null;
    reference_id: number | null;
    note: string | null;
    created_at: string;
}

interface ProductShowProps {
    product: {
        id: number;
        name: string;
        sku: string;
        category: { id: number; name: string } | null;
        brand: { id: number; name: string } | null;
        unit: { id: number; name: string };
        avg_cost: number;
        selling_price: number;
        current_stock: number;
        minimum_stock_level: number;
        stock_status: StockStatus;
        profit_margin: number;
        manage_stock: boolean;
        warranty_period_months: number | null;
        has_installation_service: boolean;
        track_serial_number: boolean;
        is_for_sale: boolean;
        is_active: boolean;
        image_url: string | null;
    };
    movements: Paginated<StockMovementItem>;
}

/** Small info row used in the product info list. */
function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className={cn('text-sm font-medium', mono && 'tabular-nums')}>{value}</span>
        </div>
    );
}

export default function ProductShow({ product, movements }: ProductShowProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const { t } = useTranslation();

    const [adjustingProduct, setAdjustingProduct] = useState<ProductListItem | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav', 'products'), href: route('products.index') },
        { title: product.name, href: route('products.show', product.id) },
    ];

    const openAdjust = () => {
        setAdjustingProduct({
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode: null,
            category: product.category,
            brand: product.brand,
            unit: product.unit,
            avg_cost: product.avg_cost,
            selling_price: product.selling_price,
            current_stock: product.current_stock,
            minimum_stock_level: product.minimum_stock_level,
            stock_status: product.stock_status,
            profit_margin: product.profit_margin,
            manage_stock: product.manage_stock,
            is_for_sale: product.is_for_sale,
            is_active: product.is_active,
            can_set_opening_stock: false,
            track_serial_number: product.track_serial_number,
            image_url: product.image_url,
        });
    };

    const isLowStock = product.manage_stock && product.current_stock <= product.minimum_stock_level;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={product.name} />

            <div className="space-y-6 px-4 py-6">
                {/* ───────────── Product header card ───────────── */}
                <Card className="overflow-hidden shadow-xs">
                    <CardContent className="p-0">
                        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-4">
                                <ProductImage
                                    src={product.image_url}
                                    alt={product.name}
                                    className="size-16 shrink-0 rounded-xl border object-cover shadow-xs"
                                />
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
                                        <ProductStatusBadge product={product} />
                                    </div>
                                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                        <span className="flex items-center gap-1">
                                            <Tag className="size-3.5" />
                                            <span className="font-mono text-xs">{product.sku}</span>
                                        </span>
                                        {product.category && (
                                            <span className="flex items-center gap-1">
                                                <Package className="size-3.5" />
                                                {product.category.name}
                                            </span>
                                        )}
                                        {product.brand && (
                                            <span className="flex items-center gap-1">
                                                <Warehouse className="size-3.5" />
                                                {product.brand.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Feature badges */}
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        {product.has_installation_service && (
                                            <Badge
                                                variant="outline"
                                                className="border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-400"
                                            >
                                                Installation
                                            </Badge>
                                        )}
                                        {product.track_serial_number && (
                                            <Badge variant="outline" className="border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400">
                                                Serial tracking
                                            </Badge>
                                        )}
                                        {product.warranty_period_months && (
                                            <Badge
                                                variant="outline"
                                                className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                                            >
                                                {product.warranty_period_months}m warranty
                                            </Badge>
                                        )}
                                        {!product.is_active && (
                                            <Badge variant="outline" className="text-muted-foreground">
                                                Inactive
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                                {product.manage_stock && (
                                    <Button variant="outline" onClick={openAdjust} className="gap-1.5">
                                        <SlidersHorizontal className="size-4" />
                                        Adjust Stock
                                    </Button>
                                )}
                                <Button asChild className="gap-1.5">
                                    <Link href={route('products.edit', product.id)}>
                                        <Pencil className="size-4" />
                                        Edit Product
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Low stock alert */}
                        {isLowStock && (
                            <div className="flex items-center gap-2 border-t border-amber-500/30 bg-amber-500/5 px-5 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                                <TrendingUp className="size-4 shrink-0" />
                                <span>
                                    Low stock — current{' '}
                                    <strong className="font-semibold">
                                        {product.current_stock} {product.unit.name}
                                    </strong>
                                    , minimum{' '}
                                    <strong className="font-semibold">
                                        {product.minimum_stock_level} {product.unit.name}
                                    </strong>
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ───────────── Metrics grid ───────────── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        icon={Warehouse}
                        label="Current Stock"
                        value={product.manage_stock ? `${product.current_stock} ${product.unit.name}` : 'Service'}
                        caption={product.manage_stock ? `Min: ${product.minimum_stock_level} ${product.unit.name}` : 'Not stock-tracked'}
                        accent="info"
                    />
                    <MetricCard icon={CircleDollarSign} label="Average Unit Cost" value={money(product.avg_cost)} accent="warning" />
                    <MetricCard icon={Tag} label="Selling Price" value={money(product.selling_price)} accent="success" />
                    <MetricCard icon={Percent} label="Profit Margin" value={`${product.profit_margin.toFixed(1)}%`} accent="financial" />
                </div>

                {/* ───────────── Two-column: info + movements ───────────── */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Info sidebar */}
                    <Card className="shadow-xs lg:col-span-1">
                        <CardHeader divided className="bg-muted/30 border-b px-4 py-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <Package className="text-muted-foreground size-4" />
                                Product Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 py-2">
                            <InfoRow label="SKU" value={product.sku} mono />
                            <InfoRow label="Unit" value={product.unit.name} />
                            <InfoRow label="Category" value={product.category?.name ?? '—'} />
                            <InfoRow label="Brand" value={product.brand?.name ?? '—'} />
                            <InfoRow label="Stock managed" value={product.manage_stock ? 'Yes' : 'No'} />
                            <InfoRow label="For sale" value={product.is_for_sale ? 'Yes' : 'No'} />
                            <InfoRow label="Active" value={product.is_active ? 'Yes' : 'No'} />
                            <InfoRow label="Warranty" value={product.warranty_period_months ? `${product.warranty_period_months} months` : '—'} />
                            <InfoRow label="Installation" value={product.has_installation_service ? 'Available' : '—'} />
                            <InfoRow label="Serial tracking" value={product.track_serial_number ? 'Enabled' : '—'} />
                        </CardContent>
                    </Card>

                    {/* Movements table */}
                    <Card className="shadow-xs lg:col-span-2">
                        <CardHeader divided className="bg-muted/30 flex flex-row items-center gap-3 space-y-0 border-b px-4 py-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400">
                                <History className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold">Stock Movement History</CardTitle>
                                <p className="text-muted-foreground mt-0.5 text-xs">Opening stock, purchases, sales, returns and adjustments</p>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            {movements.data.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-12 text-center">
                                    <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                                        <History className="text-muted-foreground size-5" />
                                    </div>
                                    <p className="text-sm font-medium">No stock movements yet</p>
                                    <p className="text-muted-foreground max-w-xs text-xs">
                                        Opening stock, purchases, sales and adjustments will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
                                                    Date
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide uppercase">Type</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold tracking-wide uppercase">Qty</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold tracking-wide uppercase">Unit Cost</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold tracking-wide uppercase">Total</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide uppercase">Note</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {movements.data.map((movement) => (
                                                <tr key={movement.id} className="hover:bg-primary/[0.03] transition-colors">
                                                    <td className="text-muted-foreground px-4 py-2.5 text-xs whitespace-nowrap">
                                                        {formatDate(movement.created_at)}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'inline-flex items-center gap-1 font-medium',
                                                                movement.is_increase
                                                                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                                                                    : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
                                                            )}
                                                        >
                                                            {movement.is_increase ? (
                                                                <ArrowDownLeft className="size-3" />
                                                            ) : (
                                                                <ArrowUpRight className="size-3" />
                                                            )}
                                                            {movement.type_label}
                                                        </Badge>
                                                    </td>
                                                    <td
                                                        className={cn(
                                                            'px-4 py-2.5 text-right font-medium tabular-nums',
                                                            movement.is_increase
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-amber-600 dark:text-amber-400',
                                                        )}
                                                    >
                                                        {movement.is_increase ? '+' : '−'}
                                                        {movement.quantity}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right tabular-nums">
                                                        {movement.unit_cost !== null ? money(movement.unit_cost) : '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                        {movement.total_cost !== null ? money(movement.total_cost) : '—'}
                                                    </td>
                                                    <td className="text-muted-foreground max-w-xs truncate px-4 py-2.5 text-xs">
                                                        {movement.note ?? '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {movements.data.length > 0 && (
                                <div className="bg-muted/30 border-t px-4 py-3">
                                    <DataTablePagination
                                        pagination={movements}
                                        perPage={movements.per_page}
                                        perPageOptions={shop.pagination_options}
                                        allowAll={shop.pagination_allow_all}
                                        onPerPageChange={(value) =>
                                            router.get(route('products.show', product.id), { per_page: value }, { preserveState: true })
                                        }
                                        onPageChange={(page) => router.get(route('products.show', product.id), { page }, { preserveState: true })}
                                        itemLabel="movements"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <StockAdjustmentModal product={adjustingProduct} onOpenChange={(open) => !open && setAdjustingProduct(null)} />
        </AppLayout>
    );
}
