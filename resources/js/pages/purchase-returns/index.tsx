import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Paginated, type PurchaseReturnListItem } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Purchase Returns', href: '/purchase-returns' }];

interface PurchaseReturnsIndexProps {
    returns: Paginated<PurchaseReturnListItem>;
    filters: {
        from: string | null;
        to: string | null;
    };
}

export default function PurchaseReturnsIndex({ returns, filters }: PurchaseReturnsIndexProps) {
    const money = useMoneyFormat();

    const applyFilters = (next: Partial<PurchaseReturnsIndexProps['filters']>) => {
        router.get(
            route('purchase-returns.index'),
            {
                from: next.from !== undefined ? next.from : filters.from,
                to: next.to !== undefined ? next.to : filters.to,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchase Returns" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Purchase Returns" description="নির্দিষ্ট Purchase-এর detail page থেকে নতুন return তৈরি করা যায়" />

                <div className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-2">
                        <Label htmlFor="from">From</Label>
                        <Input
                            id="from"
                            type="date"
                            value={filters.from ?? ''}
                            onChange={(e) => applyFilters({ from: e.target.value || null })}
                            className="w-40"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="to">To</Label>
                        <Input
                            id="to"
                            type="date"
                            value={filters.to ?? ''}
                            onChange={(e) => applyFilters({ to: e.target.value || null })}
                            className="w-40"
                        />
                    </div>
                </div>

                {returns.data.length === 0 ? (
                    <EmptyState title="No purchase returns yet" description="একটা received purchase-এর detail page থেকে Return বাটনে ক্লিক করুন" />
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Date</th>
                                        <th className="px-4 py-2 text-left font-medium">Purchase</th>
                                        <th className="px-4 py-2 text-left font-medium">Supplier</th>
                                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returns.data.map((purchaseReturn) => (
                                        <tr key={purchaseReturn.id} className="border-t">
                                            <td className="px-4 py-2 whitespace-nowrap">{purchaseReturn.return_date}</td>
                                            <td className="px-4 py-2">
                                                <Link
                                                    href={route('purchase-returns.show', purchaseReturn.id)}
                                                    className="underline-offset-2 hover:underline"
                                                >
                                                    {purchaseReturn.purchase.invoice_no}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2">{purchaseReturn.supplier.name}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(purchaseReturn.total_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {returns.last_page > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">
                                    Page {returns.current_page} of {returns.last_page} · {returns.total} returns
                                </p>
                                <div className="flex gap-2">
                                    {returns.prev_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={returns.prev_page_url} preserveScroll preserveState>
                                                Previous
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Previous
                                        </Button>
                                    )}

                                    {returns.next_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={returns.next_page_url} preserveScroll preserveState>
                                                Next
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Next
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
