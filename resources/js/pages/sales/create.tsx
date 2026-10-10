import SaleForm from '@/components/sales/sale-form';
import PageHeader from '@/components/shared/page-header';
import { type ProductOption } from '@/components/shared/product-search-input';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CustomerOption } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ShoppingBag } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Sales', href: '/sales' },
    { title: 'Add Sale', href: '/sales/create' },
];

interface SalesCreateProps {
    initialCustomer: CustomerOption | null;
    products: ProductOption[];
    accounts: Account[];
    initialProductId: number | null;
}

export default function SalesCreate({ initialCustomer, products, accounts, initialProductId }: SalesCreateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Sale" />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    icon={ShoppingBag}
                    iconClassName="bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400"
                    title="Add Sale"
                    description="F2 = product search · F4 = payment · Enter = confirm · Esc = cancel"
                    actions={
                        <Button variant="outline" asChild className="gap-1.5">
                            <Link href={route('sales.index')}>
                                <ChevronLeft className="size-4" />
                                Back to sales
                            </Link>
                        </Button>
                    }
                />

                <SaleForm
                    mode="create"
                    initialCustomer={initialCustomer}
                    products={products}
                    accounts={accounts}
                    initialProductId={initialProductId}
                />
            </div>
        </AppLayout>
    );
}
