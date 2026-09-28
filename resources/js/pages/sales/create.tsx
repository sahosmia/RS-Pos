import SaleForm from '@/components/sales/sale-form';
import { type ProductOption } from '@/components/shared/product-search-input';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
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
}

export default function SalesCreate({ initialCustomer, products, accounts }: SalesCreateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Sale" />

            <div className="space-y-6 px-4 py-6">
                {/* ───────────── Page header ───────────── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400">
                            <ShoppingBag className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Add Sale</h1>
                            <p className="text-muted-foreground text-sm">
                                F2 = product search · F4 = payment · Enter = confirm · Esc = cancel
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" asChild className="gap-1.5">
                        <Link href={route('sales.index')}>
                            <ChevronLeft className="size-4" />
                            Back to sales
                        </Link>
                    </Button>
                </div>

                <SaleForm mode="create" initialCustomer={initialCustomer} products={products} accounts={accounts} />
            </div>
        </AppLayout>
    );
}
