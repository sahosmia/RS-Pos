import BillDiscountForm from '@/components/bills/bill-discount-form';
import HeadingSmall from '@/components/heading-small';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Add Discount', href: '/bills/discount' }];

export default function BillDiscount() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Discount" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall
                    title="Add Discount"
                    description="কোনো নির্দিষ্ট সেল ছাড়াই কন্টাক্টের বকেয়া থেকে ছাড় দিন — সবচেয়ে পুরনো due invoice থেকে স্বয়ংক্রিয়ভাবে কাটা হবে, কোনো ক্যাশ মুভমেন্ট হবে না"
                />

                <BillDiscountForm />
            </div>
        </AppLayout>
    );
}
