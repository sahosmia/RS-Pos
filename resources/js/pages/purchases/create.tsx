import HeadingSmall from '@/components/heading-small';
import PurchaseForm from '@/components/purchases/purchase-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type PurchaseProductOption, type SupplierOption } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Purchases', href: '/purchases' },
    { title: 'Add Purchase', href: '/purchases/create' },
];

interface ProductsCreateProps {
    initialSupplier: SupplierOption | null;
    initialProducts: PurchaseProductOption[];
}

export default function PurchasesCreate({ initialSupplier, initialProducts }: ProductsCreateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Purchase" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Add Purchase" description="নতুন purchase তৈরি করুন — Draft/Ordered অবস্থায় stock-এ প্রভাব পড়বে না" />

                <PurchaseForm mode="create" initialSupplier={initialSupplier} initialProducts={initialProducts} />
            </div>
        </AppLayout>
    );
}
