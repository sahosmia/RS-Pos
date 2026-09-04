import HeadingSmall from '@/components/heading-small';
import SaleForm from '@/components/sales/sale-form';
import { type ProductOption } from '@/components/shared/product-search-input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CustomerOption } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Sales', href: '/sales' },
    { title: 'Add Sale', href: '/sales/create' },
];

interface SalesCreateProps {
    customers: CustomerOption[];
    products: ProductOption[];
    accounts: Account[];
}

export default function SalesCreate({ customers, products, accounts }: SalesCreateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Sale" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Add Sale" description="F2 = product search · F4 = payment · Enter = confirm · Esc = cancel" />

                <SaleForm mode="create" customers={customers} products={products} accounts={accounts} />
            </div>
        </AppLayout>
    );
}
