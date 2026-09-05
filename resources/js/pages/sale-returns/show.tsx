import HeadingSmall from '@/components/heading-small';
import RefundSaleReturnModal from '@/components/sale-returns/refund-sale-return-modal';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type SaleReturnDetail } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface SaleReturnShowProps {
    return: SaleReturnDetail;
    accounts: Account[];
}

export default function SaleReturnShow({ return: saleReturn, accounts }: SaleReturnShowProps) {
    const money = useMoneyFormat();
    const [refundOpen, setRefundOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sale Returns', href: '/sale-returns' },
        { title: `Return #${saleReturn.id}`, href: `/sale-returns/${saleReturn.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Sale Return #${saleReturn.id}`} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <HeadingSmall title={`Return #${saleReturn.id}`} description={`${saleReturn.customer.name} • ${saleReturn.return_date}`} />
                        <Link href={route('sales.show', saleReturn.sale.id)} className="text-sm underline-offset-2 hover:underline">
                            {saleReturn.sale.invoice_no}
                        </Link>
                    </div>

                    <Button onClick={() => setRefundOpen(true)}>Refund Payment</Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Return Amount</p>
                        <p className="text-xl font-semibold tabular-nums">{money(saleReturn.total_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Customer Balance</p>
                        <p className="text-xl font-semibold tabular-nums">{money(saleReturn.customer.balance)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Reason</p>
                        <p className="text-sm">{saleReturn.reason ?? '—'}</p>
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
                            {saleReturn.items.map((item) => (
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
                                <td className="px-4 py-2 text-right tabular-nums">{money(saleReturn.total_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <RefundSaleReturnModal open={refundOpen} onOpenChange={setRefundOpen} saleReturn={saleReturn} accounts={accounts} />
        </AppLayout>
    );
}
