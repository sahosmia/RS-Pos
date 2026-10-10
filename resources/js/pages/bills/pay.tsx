import BillPaymentForm from '@/components/bills/bill-payment-form';
import HeadingSmall from '@/components/heading-small';
import AppLayout from '@/layouts/app-layout';
import { pageContainer } from '@/lib/page-container';
import { type BreadcrumbItem } from '@/types';
import { type Account } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Bill Pay', href: '/bills/pay' }];

interface BillPayProps {
    accounts: Account[];
}

export default function BillPay({ accounts }: BillPayProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bill Pay" />

            <div className={pageContainer.narrow}>
                <HeadingSmall title="Bill Pay" description="কোনো সাপ্লায়ারকে বকেয়া পরিশোধ করুন — সরাসরি তার লেজার ও অ্যাকাউন্টে জমা হবে" />

                <BillPaymentForm direction="made" accounts={accounts} />
            </div>
        </AppLayout>
    );
}
