import PurchaseForm from '@/components/purchases/purchase-form';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type PurchaseFormDetail, type PurchaseProductOption, type SupplierOption } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, Pencil } from 'lucide-react';

interface PurchasesEditProps {
    purchase: PurchaseFormDetail;
    initialSupplier: SupplierOption | null;
    initialProducts: PurchaseProductOption[];
    accounts: Account[];
}

export default function PurchasesEdit({ purchase, initialSupplier, initialProducts, accounts }: PurchasesEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Purchases', href: '/purchases' },
        { title: purchase.reference_no ?? 'Purchase', href: route('purchases.show', purchase.id) },
        { title: 'Edit', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Purchase" />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    icon={Pencil}
                    iconClassName="bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400"
                    title="Edit Purchase"
                    description={
                        <>
                            {purchase.reference_no ?? `Purchase #${purchase.id}`}
                            <span className="ml-2 font-medium">· Draft/Ordered অবস্থায় স্বাধীনভাবে সম্পাদনা করা যায়</span>
                        </>
                    }
                    actions={
                        <Button variant="outline" asChild className="gap-1.5">
                            <Link href={route('purchases.show', purchase.id)}>
                                <ChevronLeft className="size-4" />
                                Back to purchase
                            </Link>
                        </Button>
                    }
                />

                <PurchaseForm mode="edit" purchase={purchase} initialSupplier={initialSupplier} initialProducts={initialProducts} accounts={accounts} />
            </div>
        </AppLayout>
    );
}
