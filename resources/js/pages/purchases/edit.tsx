import PurchaseForm from '@/components/purchases/purchase-form';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { type PurchaseFormDetail, type PurchaseProductOption, type SupplierOption } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, Pencil } from 'lucide-react';

interface PurchasesEditProps {
    purchase: PurchaseFormDetail;
    initialSupplier: SupplierOption | null;
    initialProducts: PurchaseProductOption[];
}

export default function PurchasesEdit({ purchase, initialSupplier, initialProducts }: PurchasesEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Purchases', href: '/purchases' },
        { title: purchase.reference_no ?? 'Purchase', href: route('purchases.show', purchase.id) },
        { title: 'Edit', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Purchase" />

            <div className="space-y-6 px-4 py-6">
                {/* ───────────── Page header ───────────── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
                            <Pencil className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Edit Purchase</h1>
                            <p className="text-muted-foreground text-sm">
                                {purchase.reference_no ?? `Purchase #${purchase.id}`}
                                <span className="ml-2 font-medium">· Draft/Ordered অবস্থায় স্বাধীনভাবে সম্পাদনা করা যায়</span>
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" asChild className="gap-1.5">
                        <Link href={route('purchases.show', purchase.id)}>
                            <ChevronLeft className="size-4" />
                            Back to purchase
                        </Link>
                    </Button>
                </div>

                <PurchaseForm mode="edit" purchase={purchase} initialSupplier={initialSupplier} initialProducts={initialProducts} />
            </div>
        </AppLayout>
    );
}
