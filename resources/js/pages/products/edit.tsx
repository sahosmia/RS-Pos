import HeadingSmall from '@/components/heading-small';
import ProductForm from '@/components/products/product-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Brand, type Category, type ProductDetail, type Unit } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Products', href: '/products' },
    { title: 'Edit Product', href: '#' },
];

interface ProductsEditProps {
    product: ProductDetail;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
}

export default function ProductsEdit({ product, categories, brands, units }: ProductsEditProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${product.name}`} />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Edit Product" description={product.name} />

                <ProductForm mode="edit" product={product} categories={categories} brands={brands} units={units} />
            </div>
        </AppLayout>
    );
}
