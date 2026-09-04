import HeadingSmall from '@/components/heading-small';
import ProductForm from '@/components/products/product-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Brand, type Category, type Unit } from '@/types/models';
import { Head } from '@inertiajs/react';

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
                <HeadingSmall title="Add Product" description="নতুন পণ্য যোগ করুন" />

                <ProductForm mode="create" categories={categories} brands={brands} units={units} />
            </div>
        </AppLayout>
    );
}
