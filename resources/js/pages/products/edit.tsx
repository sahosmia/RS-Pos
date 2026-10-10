import ProductForm from '@/components/products/product-form';
import { BackButton } from '@/components/shared/action-buttons';
import PageHeader from '@/components/shared/page-header';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Brand, type Category, type ProductDetail, type Unit } from '@/types/models';
import { Head } from '@inertiajs/react';
import { Pencil } from 'lucide-react';

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
                <PageHeader
                    icon={Pencil}
                    iconClassName="bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400"
                    title="Edit Product"
                    description={
                        <>
                            {product.name}
                            {product.sku && <span className="ml-2 font-mono text-xs">· {product.sku}</span>}
                        </>
                    }
                    actions={<BackButton href={route('products.show', product.id)}>Back to product</BackButton>}
                />

                <ProductForm mode="edit" product={product} categories={categories} brands={brands} units={units} />
            </div>
        </AppLayout>
    );
}
