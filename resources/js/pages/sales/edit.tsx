import SaleForm from '@/components/sales/sale-form';
import PageHeader from '@/components/shared/page-header';
import { type ProductOption } from '@/components/shared/product-search-input';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
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
                <PageHeader
                    icon={Pencil}
                    iconClassName="bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400"
                    title="Edit Sale"
                    description={
                        <>
                            {sale.invoice_no}
                            <span className="ml-2 font-medium">
                                {sale.amending
                                    ? '· Confirmed sale: সেভ করলে আগেরটা উল্টে একই invoice-এ নতুনটা confirm হবে (stock, due, payment, হিসাব সব মিলে যাবে)'
                                    : '· Draft/Quotation অবস্থায় স্বাধীনভাবে সম্পাদনা করা যায়'}
                            </span>
                        </>
                    }
                    actions={
                        <Button variant="outline" asChild className="gap-1.5">
                            <Link href={route('sales.show', sale.id)}>
                                <ChevronLeft className="size-4" />
                                Back to sale
                            </Link>
                        </Button>
                    }
                />

                <SaleForm mode="edit" sale={sale} initialCustomer={initialCustomer} products={products} accounts={accounts} />
            </div>
        </AppLayout>
    );
}
