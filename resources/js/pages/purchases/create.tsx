import PurchaseForm from '@/components/purchases/purchase-form';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type PurchaseProductOption, type SupplierOption } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ShoppingCart } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Purchases', href: '/purchases' },
    { title: 'Add Purchase', href: '/purchases/create' },
];

interface PurchasesCreateProps {
    initialSupplier: SupplierOption | null;
    initialProducts: PurchaseProductOption[];
    accounts: Account[];
}

export default function PurchasesCreate({ initialSupplier, initialProducts, accounts }: PurchasesCreateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Purchase" />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    icon={ShoppingCart}
                    iconClassName="bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/20 dark:text-purple-400"
                    title="Add Purchase"
                    description="নতুন purchase তৈরি করুন — Draft/Ordered অবস্থায় stock-এ প্রভাব পড়বে না"
                    actions={
                        <Button variant="outline" asChild className="gap-1.5">
                            <Link href={route('purchases.index')}>
                                <ChevronLeft className="size-4" />
                                Back to purchases
                            </Link>
                        </Button>
                    }
                />

                <PurchaseForm mode="create" initialSupplier={initialSupplier} initialProducts={initialProducts} accounts={accounts} />
            </div>
        </AppLayout>
    );
}
