import ProductForm from '@/components/products/product-form';
import { BackButton } from '@/components/shared/action-buttons';
import PageHeader from '@/components/shared/page-header';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Brand, type Category, type Unit } from '@/types/models';
import { Head } from '@inertiajs/react';
import { PackagePlus } from 'lucide-react';

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
                <PageHeader
                    icon={PackagePlus}
                    iconClassName="bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400"
                    title="Add Product"
                    description="নতুন পণ্য যোগ করুন — নাম, দাম, স্টক ও সার্ভিস তথ্য পূরণ করুন"
                    actions={<BackButton href={route('products.index')}>Back to products</BackButton>}
                />

                <ProductForm mode="create" categories={categories} brands={brands} units={units} />
            </div>
        </AppLayout>
    );
}
