import HeadingSmall from '@/components/heading-small';
import SaleForm from '@/components/sales/sale-form';
import { type ProductOption } from '@/components/shared/product-search-input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CustomerOption, type SaleFormDetail } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Sales', href: '/sales' },
    { title: 'Edit Sale', href: '#' },
];

interface SalesEditProps {
    sale: SaleFormDetail;
    customers: CustomerOption[];
    products: ProductOption[];
    accounts: Account[];
}

export default function SalesEdit({ sale, customers, products, accounts }: SalesEditProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Sale" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Edit Sale" description="Draft/Quotation অবস্থায় স্বাধীনভাবে সম্পাদনা করা যায়" />

                <SaleForm mode="edit" sale={sale} customers={customers} products={products} accounts={accounts} />
            </div>
        </AppLayout>
    );
}
