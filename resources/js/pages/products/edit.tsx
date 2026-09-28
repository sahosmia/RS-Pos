import ProductForm from '@/components/products/product-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Brand, type Category, type ProductDetail, type Unit } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductsEditProps {
    product: ProductDetail;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
}

export default function ProductsEdit({ product, categories, brands, units }: ProductsEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Products', href: '/products' },
        { title: product.name, href: route('products.show', product.id) },
        { title: 'Edit', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${product.name}`} />

            <div className="space-y-6 px-4 py-6">
                {/* ───────────── Page header ───────────── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
                            <Pencil className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Edit Product</h1>
                            <p className="text-muted-foreground text-sm">
                                {product.name}
                                {product.sku && <span className="ml-2 font-mono text-xs">· {product.sku}</span>}
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" asChild className="gap-1.5">
                        <Link href={route('products.show', product.id)}>
                            <ChevronLeft className="size-4" />
                            Back to product
                        </Link>
                    </Button>
                </div>

                <ProductForm mode="edit" product={product} categories={categories} brands={brands} units={units} />
            </div>
        </AppLayout>
    );
}
