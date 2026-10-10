import SaleForm from '@/components/sales/sale-form';
import PageHeader from '@/components/shared/page-header';
import { type ProductOption } from '@/components/shared/product-search-input';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CustomerOption, type SaleFormDetail } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft } from 'lucide-react';

interface SalesOrderConfirmProps {
    order: { id: number; order_no: string; advance_paid: number };
    sale: SaleFormDetail;
    initialCustomer: CustomerOption | null;
    products: ProductOption[];
    accounts: Account[];
}

/** The order opened in the full sale form: change whatever is needed (items, prices, serials, payment), then Confirm. */
export default function SalesOrderConfirm({ order, sale, initialCustomer, products, accounts }: SalesOrderConfirmProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sales Order', href: '/sales-orders' },
        { title: order.order_no, href: route('sales-orders.show', order.id) },
        { title: 'Confirm', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Confirm ${order.order_no}`} />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    icon={CheckCircle2}
                    iconClassName="bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20 dark:text-teal-400"
                    title="Confirm Sales Order"
                    description={`${order.order_no} — যা বদলানো দরকার বদলান (পণ্য, দাম, serial, পেমেন্ট), তারপর Confirm Sale। Confirm হলে এটা Sales Order তালিকা থেকে চলে যাবে।`}
                    actions={
                        <Button variant="outline" asChild className="gap-1.5">
                            <Link href={route('sales-orders.show', order.id)}>
                                <ChevronLeft className="size-4" />
                                Back to order
                            </Link>
                        </Button>
                    }
                />

                <SaleForm mode="create" fulfilOrder={order} sale={sale} initialCustomer={initialCustomer} products={products} accounts={accounts} />
            </div>
        </AppLayout>
    );
}
