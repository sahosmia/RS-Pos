import SaleForm from '@/components/sales/sale-form';
import { type ProductOption } from '@/components/shared/product-search-input';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CustomerOption, type SaleFormDetail } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, Pencil } from 'lucide-react';

interface SalesEditProps {
    sale: SaleFormDetail;
    initialCustomer: CustomerOption | null;
    products: ProductOption[];
    accounts: Account[];
}

export default function SalesEdit({ sale, initialCustomer, products, accounts }: SalesEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sales', href: '/sales' },
        { title: sale.invoice_no, href: route('sales.show', sale.id) },
        { title: 'Edit', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${sale.invoice_no}`} />

            <div className="space-y-6 px-4 py-6">
                {/* ───────────── Page header ───────────── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
                            <Pencil className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Edit Sale</h1>
                            <p className="text-muted-foreground text-sm">
                                {sale.invoice_no}
                                <span className="ml-2 font-medium">· Draft/Quotation অবস্থায় স্বাধীনভাবে সম্পাদনা করা যায়</span>
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" asChild className="gap-1.5">
                        <Link href={route('sales.show', sale.id)}>
                            <ChevronLeft className="size-4" />
                            Back to sale
                        </Link>
                    </Button>
                </div>

                <SaleForm mode="edit" sale={sale} initialCustomer={initialCustomer} products={products} accounts={accounts} />
            </div>
        </AppLayout>
    );
}
