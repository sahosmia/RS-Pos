import HeadingSmall from '@/components/heading-small';
import ConvertSalesOrderModal from '@/components/sales-orders/convert-sales-order-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type SalesOrderDetail } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface SalesOrderShowProps {
    order: SalesOrderDetail;
    accounts: Account[];
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function SalesOrderShow({ order, accounts }: SalesOrderShowProps) {
    const money = useMoneyFormat();
    const [converting, setConverting] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sales Order', href: '/sales-orders' },
        { title: order.order_no, href: `/sales-orders/${order.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={order.order_no} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall title={order.order_no} description={`${order.customer.name} • ${order.order_date}`} />

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{humanize(order.status)}</Badge>

                        {order.sale && (
                            <Button variant="outline" asChild>
                                <Link href={route('sales.show', order.sale.id)}>View Sale ({order.sale.invoice_no})</Link>
                            </Button>
                        )}

                        {order.can_convert && <Button onClick={() => setConverting(true)}>Convert to Sale</Button>}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Total</p>
                        <p className="text-xl font-semibold tabular-nums">{money(order.total_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Advance Paid</p>
                        <p className="text-xl font-semibold tabular-nums">{money(order.advance_paid)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Due</p>
                        <p className="text-xl font-semibold tabular-nums">{money(order.due_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Expected Delivery</p>
                        <p className="text-xl font-semibold">{order.expected_delivery_date ?? '—'}</p>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Product</th>
                                <th className="px-4 py-2 text-right font-medium">Quantity</th>
                                <th className="px-4 py-2 text-right font-medium">Price</th>
                                <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item) => (
                                <tr key={item.id} className="border-t">
                                    <td className="px-4 py-2">
                                        {item.product.name} <span className="text-muted-foreground">({item.product.sku})</span>
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(item.unit_price)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(item.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t font-medium">
                                <td colSpan={3} className="px-4 py-2 text-right">
                                    Total
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(order.total_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <ConvertSalesOrderModal open={converting} onOpenChange={setConverting} order={order} accounts={accounts} />
        </AppLayout>
    );
}
