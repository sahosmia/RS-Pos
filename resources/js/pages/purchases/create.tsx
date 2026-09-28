import PurchaseForm from '@/components/purchases/purchase-form';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { type PurchaseProductOption, type SupplierOption } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ShoppingCart } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Purchases', href: '/purchases' },
    { title: 'Add Purchase', href: '/purchases/create' },
];

interface PurchasesCreateProps {
    initialSupplier: SupplierOption | null;
    initialProducts: PurchaseProductOption[];
}

export default function PurchasesCreate({ initialSupplier, initialProducts }: PurchasesCreateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Purchase" />

            <div className="space-y-6 px-4 py-6">
                {/* ───────────── Page header ───────────── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/20 dark:text-purple-400">
                            <ShoppingCart className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Add Purchase</h1>
                            <p className="text-muted-foreground text-sm">
                                নতুন purchase তৈরি করুন — Draft/Ordered অবস্থায় stock-এ প্রভাব পড়বে না
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" asChild className="gap-1.5">
                        <Link href={route('purchases.index')}>
                            <ChevronLeft className="size-4" />
                            Back to purchases
                        </Link>
                    </Button>
                </div>

                <PurchaseForm mode="create" initialSupplier={initialSupplier} initialProducts={initialProducts} />
            </div>
        </AppLayout>
    );
}
