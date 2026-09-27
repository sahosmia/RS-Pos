import HeadingSmall from '@/components/heading-small';
import StockAdjustmentModal from '@/components/products/stock-adjustment-modal';
import ProductStatusBadge from '@/components/products/product-status-badge';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format-date';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Paginated, type ProductListItem } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowDownLeft, ArrowUpRight, Pencil, SlidersHorizontal } from 'lucide-react';
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
        stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'service_item' | 'inactive';
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
            image_url: product.image_url,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={product.name} />

            <div className="space-y-6 px-4 py-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="size-16 rounded-lg border object-cover" />
                        ) : (
                            <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-lg border font-bold">
                                {product.name.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold">{product.name}</h1>
                                <ProductStatusBadge status={product.stock_status} />
                            </div>
                            <p className="text-muted-foreground text-sm">
                                SKU: {product.sku} | Category: {product.category?.name ?? '—'} | Brand: {product.brand?.name ?? '—'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {product.manage_stock && (
                            <Button variant="outline" onClick={openAdjust}>
                                <SlidersHorizontal className="mr-1.5 size-4" />
                                Adjust Stock
                            </Button>
                        )}
                        <Button asChild>
                            <Link href={route('products.edit', product.id)}>
                                <Pencil className="mr-1.5 size-4" />
                                Edit Product
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Current Stock</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">
                            {product.manage_stock ? `${product.current_stock} ${product.unit.name}` : 'Service Item'}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">Min Stock: {product.minimum_stock_level} {product.unit.name}</p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Average Unit Cost</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{money(product.avg_cost)}</p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Selling Price</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{money(product.selling_price)}</p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Profit Margin</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{product.profit_margin.toFixed(1)}%</p>
                    </div>
                </div>

                {/* Stock Movement History */}
                <div className="space-y-4 rounded-lg border p-4">
                    <HeadingSmall
                        title="Stock Movement History"
                        description="Opening stock, purchases, sales, returns and stock adjustments"
                    />

                    {movements.data.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">No stock movements recorded yet.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Date & Time</th>
                                        <th className="px-4 py-2 text-left font-medium">Type</th>
                                        <th className="px-4 py-2 text-right font-medium">Quantity</th>
                                        <th className="px-4 py-2 text-right font-medium">Unit Cost</th>
                                        <th className="px-4 py-2 text-right font-medium">Total Cost</th>
                                        <th className="px-4 py-2 text-left font-medium">Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.data.map((movement) => (
                                        <tr key={movement.id} className="border-t">
                                            <td className="px-4 py-2 whitespace-nowrap">{formatDate(movement.created_at)}</td>
                                            <td className="px-4 py-2">
                                                <Badge
                                                    variant={movement.is_increase ? 'secondary' : 'outline'}
                                                    className="inline-flex items-center gap-1"
                                                >
                                                    {movement.is_increase ? (
                                                        <ArrowDownLeft className="size-3 text-emerald-600 dark:text-emerald-400" />
                                                    ) : (
                                                        <ArrowUpRight className="size-3 text-amber-600 dark:text-amber-400" />
                                                    )}
                                                    {movement.type_label}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium tabular-nums">
                                                {movement.is_increase ? `+${movement.quantity}` : `-${movement.quantity}`} {product.unit.name}
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">
                                                {movement.unit_cost !== null ? money(movement.unit_cost) : '—'}
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">
                                                {movement.total_cost !== null ? money(movement.total_cost) : '—'}
                                            </td>
                                            <td className="text-muted-foreground px-4 py-2 max-w-xs truncate">
                                                {movement.note ?? '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <DataTablePagination
                        pagination={movements}
                        perPage={movements.per_page}
                        perPageOptions={shop.pagination_options}
                        allowAll={shop.pagination_allow_all}
                        onPerPageChange={(value) => router.get(route('products.show', product.id), { per_page: value }, { preserveState: true })}
                        onPageChange={(page) => router.get(route('products.show', product.id), { page }, { preserveState: true })}
                        itemLabel="movements"
                    />
                </div>
            </div>

            <StockAdjustmentModal product={adjustingProduct} onOpenChange={(open) => !open && setAdjustingProduct(null)} />
        </AppLayout>
    );
}
