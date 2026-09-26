import HeadingSmall from '@/components/heading-small';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type DueRow } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Due Report', href: '/reports/due' }];

interface DueReportProps {
    customers: DueRow[];
    suppliers: DueRow[];
    staff: DueRow[];
    customersTotalCount: number;
    suppliersTotalCount: number;
    staffTotalCount: number;
    totalReceivable: number;
    totalPayable: number;
}

function DueTable({
    title,
    rows,
    totalCount,
    money,
}: {
    title: string;
    rows: DueRow[];
    totalCount: number;
    money: (amount: number) => string;
}) {
    return (
        <div className="space-y-1">
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium">{title}</th>
                            {rows.some((row) => row.phone) && <th className="px-4 py-2 text-left font-medium">Phone</th>}
                            <th className="px-4 py-2 text-right font-medium">Due</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-t">
                                <td className="px-4 py-2">{row.name}</td>
                                {rows.some((r) => r.phone) && <td className="px-4 py-2">{row.phone}</td>}
                                <td className="px-4 py-2 text-right tabular-nums">{money(row.balance)}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={3} className="text-muted-foreground px-4 py-6 text-center">
                                    কেউ নেই
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalCount > rows.length && (
                <p className="text-muted-foreground text-xs">
                    সবচেয়ে বেশি বকেয়া থাকা {rows.length}টা দেখানো হচ্ছে, মোট {totalCount} জনের বকেয়া আছে
                </p>
            )}
        </div>
    );
}

export default function DueReport({
    customers,
    suppliers,
    staff,
    customersTotalCount,
    suppliersTotalCount,
    staffTotalCount,
    totalReceivable,
    totalPayable,
}: DueReportProps) {
    const money = useMoneyFormat();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Due Report" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Due Report" description="Customer/Supplier/Staff-এর বকেয়া" />

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Total Receivable</p>
                        <p className="text-xl font-semibold tabular-nums">{money(totalReceivable)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Total Payable</p>
                        <p className="text-xl font-semibold tabular-nums">{money(totalPayable)}</p>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <DueTable title="Customer" rows={customers} totalCount={customersTotalCount} money={money} />
                    <DueTable title="Supplier" rows={suppliers} totalCount={suppliersTotalCount} money={money} />
                    <DueTable title="Staff" rows={staff} totalCount={staffTotalCount} money={money} />
                </div>
            </div>
        </AppLayout>
    );
}
