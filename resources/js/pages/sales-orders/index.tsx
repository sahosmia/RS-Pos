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
import { type Paginated, type SalesOrderListItem, type SalesOrderStatusValue } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales Order', href: '/sales-orders' }];

interface SalesOrdersIndexProps {
    orders: Paginated<SalesOrderListItem>;
    customers: { id: number; name: string }[];
    filters: {
        from: string | null;
        to: string | null;
        customer_id: number | null;
        status: SalesOrderStatusValue | null;
    };
}

const statusVariant: Record<SalesOrderStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    pending: 'outline',
    partial: 'outline',
    completed: 'secondary',
    cancelled: 'destructive',
};

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function SalesOrdersIndex({ orders, customers, filters }: SalesOrdersIndexProps) {
    const money = useMoneyFormat();

    const applyFilters = (next: Partial<SalesOrdersIndexProps['filters']>) => {
        router.get(
            route('sales-orders.index'),
            {
                from: next.from !== undefined ? next.from : filters.from,
                to: next.to !== undefined ? next.to : filters.to,
                customer_id: next.customer_id !== undefined ? next.customer_id : filters.customer_id,
                status: next.status !== undefined ? next.status : filters.status,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Order" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Sales Order" description="অগ্রিম বুকিং — নির্দিষ্ট সময়ে ডেলিভারির জন্য" />
                    <Button asChild>
                        <Link href={route('sales-orders.create')}>Add Sales Order</Link>
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
                        onValueChange={(value) => applyFilters({ status: value === 'all' ? null : (value as SalesOrderStatusValue) })}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {orders.data.length === 0 ? (
                    <EmptyState title="No sales orders yet" description="প্রথম sales order যোগ করুন">
                        <Button className="mt-2" asChild>
                            <Link href={route('sales-orders.create')}>Add Sales Order</Link>
                        </Button>
                    </EmptyState>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Order No</th>
                                        <th className="px-4 py-2 text-left font-medium">Customer</th>
                                        <th className="px-4 py-2 text-left font-medium">Order Date</th>
                                        <th className="px-4 py-2 text-left font-medium">Expected Delivery</th>
                                        <th className="px-4 py-2 text-right font-medium">Total</th>
                                        <th className="px-4 py-2 text-right font-medium">Advance</th>
                                        <th className="px-4 py-2 text-right font-medium">Due</th>
                                        <th className="px-4 py-2 text-left font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.data.map((order) => (
                                        <tr key={order.id} className="border-t">
                                            <td className="px-4 py-2">
                                                <Link
                                                    href={route('sales-orders.show', order.id)}
                                                    className="font-medium underline-offset-2 hover:underline"
                                                >
                                                    {order.order_no}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2">{order.customer.name}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{order.order_date}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{order.expected_delivery_date ?? '—'}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(order.total_amount)}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(order.advance_paid)}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(order.due_amount)}</td>
                                            <td className="px-4 py-2">
                                                <Badge variant={statusVariant[order.status]}>{humanize(order.status)}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {orders.last_page > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">
                                    Page {orders.current_page} of {orders.last_page} · {orders.total} orders
                                </p>
                                <div className="flex gap-2">
                                    {orders.prev_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={orders.prev_page_url} preserveScroll preserveState>
                                                Previous
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Previous
                                        </Button>
                                    )}

                                    {orders.next_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={orders.next_page_url} preserveScroll preserveState>
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
