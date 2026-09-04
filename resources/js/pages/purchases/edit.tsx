import HeadingSmall from '@/components/heading-small';
import PurchaseForm from '@/components/purchases/purchase-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type PurchaseFormDetail } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Purchases', href: '/purchases' },
    { title: 'Edit Purchase', href: '#' },
];

interface PurchasesEditProps {
    purchase: PurchaseFormDetail;
    suppliers: { id: number; name: string }[];
    products: { id: number; name: string; sku: string; avg_cost: number }[];
}

export default function PurchasesEdit({ purchase, suppliers, products }: PurchasesEditProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Purchase" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Edit Purchase" description="Draft/Ordered অবস্থায় স্বাধীনভাবে সম্পাদনা করা যায়" />

                <PurchaseForm mode="edit" purchase={purchase} suppliers={suppliers} products={products} />
            </div>
        </AppLayout>
    );
}
