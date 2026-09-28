import ProductForm from '@/components/products/product-form';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { type Brand, type Category, type Unit } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, PackagePlus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Products', href: '/products' },
    { title: 'Add Product', href: '/products/create' },
];

interface ProductsCreateProps {
    categories: Category[];
    brands: Brand[];
    units: Unit[];
}

export default function ProductsCreate({ categories, brands, units }: ProductsCreateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Product" />

            <div className="space-y-6 px-4 py-6">
                {/* ───────────── Page header ───────────── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400">
                            <PackagePlus className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Add Product</h1>
                            <p className="text-muted-foreground text-sm">
                                নতুন পণ্য যোগ করুন — নাম, দাম, স্টক ও সার্ভিস তথ্য পূরণ করুন
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" asChild className="gap-1.5">
                        <Link href={route('products.index')}>
                            <ChevronLeft className="size-4" />
                            Back to products
                        </Link>
                    </Button>
                </div>

                <ProductForm mode="create" categories={categories} brands={brands} units={units} />
            </div>
        </AppLayout>
    );
}
