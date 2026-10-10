import HeadingSmall from '@/components/heading-small';
import ContactLink from '@/components/shared/contact-link';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type SalesOrderDetail } from '@/types/models';
import { Head, Link } from '@inertiajs/react';

interface SalesOrderShowProps {
    order: SalesOrderDetail;
}

/** What else was booked on a line: installation, warranty, service plan, planned serials, and whether it is on EMI. */
function LineDetails({ item, money }: { item: SalesOrderDetail['items'][number]; money: (amount: number) => string }) {
    const notes = [
        item.installation_required ? `Installation ${money(item.installation_charge ?? 0)}` : null,
        item.warranty_months ? `Warranty ${item.warranty_months} mo` : null,
        !item.service_plan_included ? 'No service plan' : null,
        item.serial_numbers.length > 0 ? `Serial: ${item.serial_numbers.join(', ')}` : null,
        !item.emi_financed ? 'Not on EMI' : null,
    ].filter(Boolean);

    return notes.length > 0 ? <div className="text-muted-foreground text-xs">{notes.join(' · ')}</div> : null;
}

export default function SalesOrderShow({ order }: SalesOrderShowProps) {
    const money = useMoneyFormat();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sales Order', href: '/sales-orders' },
        { title: order.order_no, href: `/sales-orders/${order.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={order.order_no} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall
                        title={order.order_no}
                        description={
                            <>
                                <ContactLink id={order.customer.id} name={order.customer.name} /> • {order.order_date}
                            </>
                        }
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={order.status} />

                        {order.sale && (
                            <Button variant="outline" asChild>
                                <Link href={route('sales.show', order.sale.id)}>View Sale ({order.sale.invoice_no})</Link>
                            </Button>
                        )}

                        {order.can_convert && (
                            <Button asChild>
                                <Link href={route('sales-orders.confirm', order.id)}>Confirm Sale</Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-brand-card bg-card p-4 shadow-[var(--brand-card-shadow-elevated)]">
                        <p className="text-muted-foreground text-sm">Total</p>
                        <p className="text-xl font-semibold tabular-nums">{money(order.total_amount)}</p>
                    </div>
                    <div className="rounded-brand-card bg-card p-4 shadow-[var(--brand-card-shadow-elevated)]">
                        <p className="text-muted-foreground text-sm">Advance Paid</p>
                        <p className="text-xl font-semibold tabular-nums">{money(order.advance_paid)}</p>
                    </div>
                    <div className="rounded-brand-card bg-card p-4 shadow-[var(--brand-card-shadow-elevated)]">
                        <p className="text-muted-foreground text-sm">Due</p>
                        <p className="text-xl font-semibold tabular-nums">{money(order.due_amount)}</p>
                    </div>
                    <div className="rounded-brand-card bg-card p-4 shadow-[var(--brand-card-shadow-elevated)]">
                        <p className="text-muted-foreground text-sm">Expected Delivery</p>
                        <p className="text-xl font-semibold">{order.expected_delivery_date ?? '—'}</p>
                    </div>
                </div>

                {order.financing_type === 'emi' && (
                    <p className="text-muted-foreground text-sm">
                        EMI: {order.installment_count ?? '—'} installments
                        {order.emi_interest_method && order.emi_interest_method !== 'none'
                            ? ` · ${order.emi_interest_method} ${order.emi_annual_rate}%`
                            : ' · no interest'}{' '}
                        — the plan is created when this order is converted to a sale.
                    </p>
                )}

                <div className="rounded-brand-card bg-card overflow-x-auto shadow-[var(--brand-card-shadow-elevated)]">
                    <table className="w-full text-sm">
                        <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium">Product</th>
                                <th className="px-4 py-2.5 text-right font-medium">Quantity</th>
                                <th className="px-4 py-2.5 text-right font-medium">Price</th>
                                <th className="px-4 py-2.5 text-right font-medium">Discount</th>
                                <th className="px-4 py-2.5 text-right font-medium">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item) => (
                                <tr key={item.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
                                    <td className="px-4 py-2">
                                        {item.product.name} <span className="text-muted-foreground">({item.product.sku})</span>
                                        <LineDetails item={item} money={money} />
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(item.original_price)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">
                                        {item.discount_amount > 0 ? `-${money(item.discount_amount * item.quantity)}` : '—'}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(item.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            {order.discount_amount > 0 && (
                                <tr className="border-brand-table-divider border-t">
                                    <td colSpan={4} className="px-4 py-2 text-right">
                                        Invoice discount
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">-{money(order.discount_amount)}</td>
                                </tr>
                            )}
                            {order.installation_amount > 0 && (
                                <tr className="border-brand-table-divider border-t">
                                    <td colSpan={4} className="px-4 py-2 text-right">
                                        Installation
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">+{money(order.installation_amount)}</td>
                                </tr>
                            )}
                            <tr className="border-brand-table-divider border-t font-medium">
                                <td colSpan={4} className="px-4 py-2 text-right">
                                    Total
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(order.total_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
