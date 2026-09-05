import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type AccountingPeriodListItem } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Accounting Periods', href: '/accounting-periods' }];

interface AccountingPeriodsIndexProps {
    periods: AccountingPeriodListItem[];
}

export default function AccountingPeriodsIndex({ periods }: AccountingPeriodsIndexProps) {
    const [closing, setClosing] = useState<AccountingPeriodListItem | null>(null);
    const [processing, setProcessing] = useState(false);

    const confirmClose = () => {
        if (!closing) return;

        setProcessing(true);
        router.patch(route('accounting-periods.close', closing.id), undefined, {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                setClosing(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accounting Periods" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall
                    title="Accounting Periods"
                    description="একটা period close করলে সেই মাসের কোনো তারিখে আর নতুন journal entry post করা যাবে না"
                />

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Period</th>
                                <th className="px-4 py-2 text-left font-medium">Status</th>
                                <th className="px-4 py-2 text-left font-medium">Closed At</th>
                                <th className="px-4 py-2 text-left font-medium">Closed By</th>
                                <th className="px-4 py-2 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map((period) => (
                                <tr key={period.id} className="border-t">
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        {period.start_date} – {period.end_date}
                                    </td>
                                    <td className="px-4 py-2">
                                        <Badge variant={period.status === 'open' ? 'secondary' : 'outline'}>
                                            {period.status === 'open' ? 'Open' : 'Closed'}
                                        </Badge>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-2">{period.closed_at ?? '—'}</td>
                                    <td className="text-muted-foreground px-4 py-2">{period.closed_by?.name ?? '—'}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex justify-end">
                                            {period.status === 'open' && (
                                                <Button variant="ghost" size="sm" onClick={() => setClosing(period)}>
                                                    Close
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDialog
                open={closing !== null}
                onOpenChange={(open) => !open && setClosing(null)}
                title="Close this period?"
                description={`${closing?.start_date} থেকে ${closing?.end_date} পর্যন্ত period লক হয়ে যাবে — এই তারিখগুলোর মধ্যে আর কোনো journal entry post করা যাবে না।`}
                confirmLabel="Close Period"
                processing={processing}
                onConfirm={confirmClose}
            />
        </AppLayout>
    );
}
