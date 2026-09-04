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
import { type Paginated, type PaymentStatusValue, type SaleListItem, type SaleStatusValue } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales', href: '/sales' }];

interface SalesIndexProps {
    sales: Paginated<SaleListItem>;
    customers: { id: number; name: string }[];
    filters: {
        from: string | null;
        to: string | null;
        customer_id: number | null;
        status: SaleStatusValue | null;
        payment_status: PaymentStatusValue | null;
    };
}

const statusVariant: Record<SaleStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    draft: 'outline',
    quotation: 'outline',
    confirmed: 'secondary',
    cancelled: 'destructive',
};

const paymentStatusVariant: Record<PaymentStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    due: 'destructive',
    partial: 'outline',
    paid: 'secondary',
};

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function SalesIndex({ sales, customers, filters }: SalesIndexProps) {
    const money = useMoneyFormat();

    const applyFilters = (next: Partial<SalesIndexProps['filters']>) => {
        router.get(
            route('sales.index'),
            {
                from: next.from !== undefined ? next.from : filters.from,
                to: next.to !== undefined ? next.to : filters.to,
                customer_id: next.customer_id !== undefined ? next.customer_id : filters.customer_id,
                status: next.status !== undefined ? next.status : filters.status,
                payment_status: next.payment_status !== undefined ? next.payment_status : filters.payment_status,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Sales" description="Draft, Quotation ও Confirmed — একই তালিকা, filter করে দেখুন" />
                    <Button asChild>
                        <Link href={route('sales.create')}>Add Sale</Link>
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
                        value={filters.customer_id ? String(filters.customer_id) : 'all'}
                        onValueChange={(value) => applyFilters({ customer_id: value === 'all' ? null : Number(value) })}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Customer" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All customers</SelectItem>
                            {customers.map((customer) => (
                                <SelectItem key={customer.id} value={String(customer.id)}>
                                    {customer.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.status ?? 'all'}
                        onValueChange={(value) => applyFilters({ status: value === 'all' ? null : (value as SaleStatusValue) })}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="quotation">Quotation</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
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

                {sales.data.length === 0 ? (
                    <EmptyState title="No sales yet" description="প্রথম sale যোগ করুন">
                        <Button className="mt-2" asChild>
                            <Link href={route('sales.create')}>Add Sale</Link>
                        </Button>
                    </EmptyState>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Invoice</th>
                                        <th className="px-4 py-2 text-left font-medium">Customer</th>
                                        <th className="px-4 py-2 text-left font-medium">Date</th>
                                        <th className="px-4 py-2 text-right font-medium">Total</th>
                                        <th className="px-4 py-2 text-right font-medium">Due</th>
                                        <th className="px-4 py-2 text-left font-medium">Payment</th>
                                        <th className="px-4 py-2 text-left font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.data.map((sale) => (
                                        <tr key={sale.id} className="border-t">
                                            <td className="px-4 py-2">
                                                <Link href={route('sales.show', sale.id)} className="font-medium underline-offset-2 hover:underline">
                                                    {sale.invoice_no}
                                                </Link>
                                                {sale.source === 'imported' && (
                                                    <Badge variant="outline" className="ml-2">
                                                        Historical
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">{sale.customer.name}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{sale.sale_date}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(sale.total_amount)}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(sale.due_amount)}</td>
                                            <td className="px-4 py-2">
                                                <Badge variant={paymentStatusVariant[sale.payment_status]}>{humanize(sale.payment_status)}</Badge>
                                            </td>
                                            <td className="px-4 py-2">
                                                <Badge variant={statusVariant[sale.status]}>{humanize(sale.status)}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {sales.last_page > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">
                                    Page {sales.current_page} of {sales.last_page} · {sales.total} sales
                                </p>
                                <div className="flex gap-2">
                                    {sales.prev_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={sales.prev_page_url} preserveScroll preserveState>
                                                Previous
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Previous
                                        </Button>
                                    )}

                                    {sales.next_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={sales.next_page_url} preserveScroll preserveState>
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
