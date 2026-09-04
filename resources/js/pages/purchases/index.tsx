import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Paginated, type PaymentStatusValue, type PurchaseListItem, type PurchaseStatusValue } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Purchases', href: '/purchases' }];

interface PurchasesIndexProps {
    purchases: Paginated<PurchaseListItem>;
    suppliers: { id: number; name: string }[];
    filters: {
        from: string | null;
        to: string | null;
        supplier_id: number | null;
        status: PurchaseStatusValue | null;
        payment_status: PaymentStatusValue | null;
    };
}

const statusVariant: Record<PurchaseStatusValue, 'secondary' | 'outline' | 'default' | 'destructive'> = {
    draft: 'outline',
    ordered: 'outline',
    received: 'secondary',
    cancelled: 'destructive',
};

const paymentStatusVariant: Record<PaymentStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    due: 'destructive',
    partial: 'outline',
    paid: 'secondary',
};

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function PurchasesIndex({ purchases, suppliers, filters }: PurchasesIndexProps) {
    const money = useMoneyFormat();

    const applyFilters = (next: Partial<PurchasesIndexProps['filters']>) => {
        router.get(
            route('purchases.index'),
            {
                from: next.from !== undefined ? next.from : filters.from,
                to: next.to !== undefined ? next.to : filters.to,
                supplier_id: next.supplier_id !== undefined ? next.supplier_id : filters.supplier_id,
                status: next.status !== undefined ? next.status : filters.status,
                payment_status: next.payment_status !== undefined ? next.payment_status : filters.payment_status,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchases" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Purchases" description="Supplier থেকে কেনা পণ্যের তালিকা" />
                    <Button asChild>
                        <Link href={route('purchases.create')}>Add Purchase</Link>
                    </Button>
                </div>

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

                    <Select
                        value={filters.supplier_id ? String(filters.supplier_id) : 'all'}
                        onValueChange={(value) => applyFilters({ supplier_id: value === 'all' ? null : Number(value) })}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Supplier" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All suppliers</SelectItem>
                            {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={String(supplier.id)}>
                                    {supplier.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.status ?? 'all'}
                        onValueChange={(value) => applyFilters({ status: value === 'all' ? null : (value as PurchaseStatusValue) })}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="ordered">Ordered</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.payment_status ?? 'all'}
                        onValueChange={(value) => applyFilters({ payment_status: value === 'all' ? null : (value as PaymentStatusValue) })}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Payment" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All payments</SelectItem>
                            <SelectItem value="due">Due</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {purchases.data.length === 0 ? (
                    <EmptyState title="No purchases yet" description="প্রথম purchase যোগ করুন">
                        <Button className="mt-2" asChild>
                            <Link href={route('purchases.create')}>Add Purchase</Link>
                        </Button>
                    </EmptyState>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Invoice</th>
                                        <th className="px-4 py-2 text-left font-medium">Supplier</th>
                                        <th className="px-4 py-2 text-left font-medium">Date</th>
                                        <th className="px-4 py-2 text-right font-medium">Total</th>
                                        <th className="px-4 py-2 text-right font-medium">Due</th>
                                        <th className="px-4 py-2 text-left font-medium">Payment</th>
                                        <th className="px-4 py-2 text-left font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.data.map((purchase) => (
                                        <tr key={purchase.id} className="border-t">
                                            <td className="px-4 py-2">
                                                <Link
                                                    href={route('purchases.show', purchase.id)}
                                                    className="font-medium underline-offset-2 hover:underline"
                                                >
                                                    {purchase.invoice_no}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2">{purchase.supplier.name}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{purchase.purchase_date}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(purchase.total_amount)}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(purchase.due_amount)}</td>
                                            <td className="px-4 py-2">
                                                <Badge variant={paymentStatusVariant[purchase.payment_status]}>
                                                    {humanize(purchase.payment_status)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2">
                                                <Badge variant={statusVariant[purchase.status]}>{humanize(purchase.status)}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {purchases.last_page > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">
                                    Page {purchases.current_page} of {purchases.last_page} · {purchases.total} purchases
                                </p>
                                <div className="flex gap-2">
                                    {purchases.prev_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={purchases.prev_page_url} preserveScroll preserveState>
                                                Previous
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Previous
                                        </Button>
                                    )}

                                    {purchases.next_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={purchases.next_page_url} preserveScroll preserveState>
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
