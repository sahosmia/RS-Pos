import BillPaymentForm from '@/components/bills/bill-payment-form';
import HeadingSmall from '@/components/heading-small';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Bill Receive', href: '/bills/receive' }];

interface BillReceiveProps {
    accounts: Account[];
}

export default function BillReceive({ accounts }: BillReceiveProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bill Receive" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Bill Receive" description="কোনো কাস্টমারের কাছ থেকে বকেয়া গ্রহণ করুন — সরাসরি তার লেজার ও অ্যাকাউন্টে জমা হবে" />

                <BillPaymentForm direction="received" accounts={accounts} />
            </div>
        </AppLayout>
    );
}
