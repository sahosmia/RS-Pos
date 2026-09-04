import HeadingSmall from '@/components/heading-small';
import LookupManagerModal from '@/components/products/lookup-manager-modal';
import StockAdjustmentModal from '@/components/products/stock-adjustment-modal';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Brand, type Category, type Paginated, type ProductListItem, type StockStatus, type Unit } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Products', href: '/products' }];

interface ProductsIndexProps {
    products: Paginated<ProductListItem>;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
    filters: {
        search: string | null;
        category_id: number | null;
        brand_id: number | null;
        stock_status: StockStatus | null;
        sort: string;
        direction: 'asc' | 'desc';
    };
}

const stockStatusLabel: Record<StockStatus, string> = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
};

const stockStatusVariant: Record<StockStatus, 'secondary' | 'outline' | 'destructive'> = {
    in_stock: 'secondary',
    low_stock: 'outline',
    out_of_stock: 'destructive',
};

export default function ProductsIndex({ products, categories, brands, units, filters }: ProductsIndexProps) {
    const money = useMoneyFormat();

    const [search, setSearch] = useState(filters.search ?? '');
    const [adjusting, setAdjusting] = useState<ProductListItem | null>(null);
    const [deleting, setDeleting] = useState<ProductListItem | null>(null);
    const [lookupModal, setLookupModal] = useState<'category' | 'unit' | 'brand' | null>(null);

    const applyFilters = (next: Partial<ProductsIndexProps['filters']>) => {
        router.get(
            route('products.index'),
            {
                search: next.search !== undefined ? next.search : filters.search,
                category_id: next.category_id !== undefined ? next.category_id : filters.category_id,
                brand_id: next.brand_id !== undefined ? next.brand_id : filters.brand_id,
                stock_status: next.stock_status !== undefined ? next.stock_status : filters.stock_status,
                sort: next.sort ?? filters.sort,
                direction: next.direction ?? filters.direction,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search: search || null });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('products.destroy', deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Products" description="সব পণ্যের তালিকা — stock, দাম ও profit margin সহ" />

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => setLookupModal('category')}>
                            Categories
                        </Button>
                        <Button variant="outline" onClick={() => setLookupModal('brand')}>
                            Brands
                        </Button>
                        <Button variant="outline" onClick={() => setLookupModal('unit')}>
                            Units
                        </Button>
                        <Button asChild>
                            <Link href={route('products.create')}>Add Product</Link>
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <form onSubmit={submitSearch} className="flex items-end gap-2">
                        <div className="grid gap-2">
                            <Input placeholder="Name, SKU or barcode" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
                        </div>
                        <Button type="submit" variant="outline">
                            Search
                        </Button>
                    </form>

                    <div className="grid gap-2">
                        <Select
                            value={filters.category_id ? String(filters.category_id) : 'all'}
                            onValueChange={(value) => applyFilters({ category_id: value === 'all' ? null : Number(value) })}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={String(category.id)}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Select
                            value={filters.brand_id ? String(filters.brand_id) : 'all'}
                            onValueChange={(value) => applyFilters({ brand_id: value === 'all' ? null : Number(value) })}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Brand" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All brands</SelectItem>
                                {brands.map((brand) => (
                                    <SelectItem key={brand.id} value={String(brand.id)}>
                                        {brand.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Select
                            value={filters.stock_status ?? 'all'}
                            onValueChange={(value) => applyFilters({ stock_status: value === 'all' ? null : (value as StockStatus) })}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Stock status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All stock levels</SelectItem>
                                <SelectItem value="in_stock">In Stock</SelectItem>
                                <SelectItem value="low_stock">Low Stock</SelectItem>
                                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Select
                            value={`${filters.sort}:${filters.direction}`}
                            onValueChange={(value) => {
                                const [sort, direction] = value.split(':');
                                applyFilters({ sort, direction: direction as 'asc' | 'desc' });
                            }}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name:asc">Name (A–Z)</SelectItem>
                                <SelectItem value="name:desc">Name (Z–A)</SelectItem>
                                <SelectItem value="selling_price:asc">Price (Low–High)</SelectItem>
                                <SelectItem value="selling_price:desc">Price (High–Low)</SelectItem>
                                <SelectItem value="current_stock:asc">Stock (Low–High)</SelectItem>
                                <SelectItem value="current_stock:desc">Stock (High–Low)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {products.data.length === 0 ? (
                    <EmptyState title="No products yet" description="প্রথম পণ্যটি যোগ করুন">
                        <Button className="mt-2" asChild>
                            <Link href={route('products.create')}>Add Product</Link>
                        </Button>
                    </EmptyState>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Product</th>
                                        <th className="px-4 py-2 text-left font-medium">Category / Brand</th>
                                        <th className="px-4 py-2 text-right font-medium">Stock</th>
                                        <th className="px-4 py-2 text-right font-medium">Price</th>
                                        <th className="px-4 py-2 text-right font-medium">Margin</th>
                                        <th className="px-4 py-2 text-left font-medium">Status</th>
                                        <th className="px-4 py-2 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.data.map((product) => (
                                        <tr key={product.id} className="border-t">
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-3">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="size-10 rounded-md border object-cover"
                                                        />
                                                    ) : (
                                                        <div className="bg-muted size-10 rounded-md border" />
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{product.name}</div>
                                                        <div className="text-muted-foreground text-xs">{product.sku}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div>{product.category.name}</div>
                                                {product.brand && <div className="text-muted-foreground text-xs">{product.brand.name}</div>}
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">
                                                {product.manage_stock ? `${product.current_stock} ${product.unit.name}` : '—'}
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(product.selling_price)}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{product.profit_margin}%</td>
                                            <td className="px-4 py-2">
                                                {product.manage_stock ? (
                                                    <Badge variant={stockStatusVariant[product.stock_status]}>
                                                        {stockStatusLabel[product.stock_status]}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">Service Item</Badge>
                                                )}
                                                {!product.is_active && (
                                                    <Badge variant="outline" className="ml-1">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex justify-end gap-2">
                                                    {product.manage_stock && (
                                                        <Button variant="ghost" size="sm" onClick={() => setAdjusting(product)}>
                                                            Adjust
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={route('products.edit', product.id)}>Edit</Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleting(product)}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {products.last_page > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">
                                    Page {products.current_page} of {products.last_page} · {products.total} products
                                </p>
                                <div className="flex gap-2">
                                    {products.prev_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={products.prev_page_url} preserveScroll preserveState>
                                                Previous
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Previous
                                        </Button>
                                    )}

                                    {products.next_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={products.next_page_url} preserveScroll preserveState>
                                                Next
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Next
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <StockAdjustmentModal product={adjusting} onOpenChange={(open) => !open && setAdjusting(null)} />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete product?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। stock movement থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />

            <LookupManagerModal
                open={lookupModal === 'category'}
                onOpenChange={(open) => !open && setLookupModal(null)}
                title="Manage Categories"
                items={categories}
                storeRouteName="categories.store"
                updateRouteName="categories.update"
                destroyRouteName="categories.destroy"
                parentOptions={categories}
            />

            <LookupManagerModal
                open={lookupModal === 'brand'}
                onOpenChange={(open) => !open && setLookupModal(null)}
                title="Manage Brands"
                items={brands}
                storeRouteName="brands.store"
                updateRouteName="brands.update"
                destroyRouteName="brands.destroy"
            />

            <LookupManagerModal
                open={lookupModal === 'unit'}
                onOpenChange={(open) => !open && setLookupModal(null)}
                title="Manage Units"
                items={units}
                storeRouteName="units.store"
                updateRouteName="units.update"
                destroyRouteName="units.destroy"
            />
        </AppLayout>
    );
}
