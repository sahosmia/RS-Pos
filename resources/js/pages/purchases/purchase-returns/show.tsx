import HeadingSmall from '@/components/heading-small';
import RefundPurchaseReturnModal from '@/components/purchases/purchase-returns/refund-purchase-return-modal';
import ContactLink from '@/components/shared/contact-link';
import { MetricCard, MetricGrid } from '@/components/shared/metric-card';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type PurchaseReturnDetail } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface PurchaseReturnShowProps {
    return: PurchaseReturnDetail;
    accounts: Account[];
}

export default function PurchaseReturnShow({ return: purchaseReturn, accounts }: PurchaseReturnShowProps) {
    const money = useMoneyFormat();
    const [refundOpen, setRefundOpen] = useState(false);
    const fullyRefunded = purchaseReturn.remaining_refundable <= 0;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Purchase Returns', href: '/purchase-returns' },
        { title: `Return #${purchaseReturn.id}`, href: `/purchase-returns/${purchaseReturn.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Purchase Return #${purchaseReturn.id}`} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <HeadingSmall
                            title={`Return #${purchaseReturn.id}`}
                            description={
                                <>
                                    <ContactLink id={purchaseReturn.supplier.id} name={purchaseReturn.supplier.name} /> • {purchaseReturn.return_date}
                                </>
                            }
                        />
                        <Link href={route('purchases.show', purchaseReturn.purchase.id)} className="text-sm underline-offset-2 hover:underline">
                            {purchaseReturn.purchase.invoice_no}
                        </Link>
                    </div>

                    {!fullyRefunded && <Button onClick={() => setRefundOpen(true)}>Refund Payment</Button>}
                </div>

                <MetricGrid>
                    <MetricCard label="Return Amount" value={money(purchaseReturn.total_amount)} accent="danger" />
                    <MetricCard
                        label="Refunded / Remaining"
                        value={`${money(purchaseReturn.refunded_amount)} / ${money(purchaseReturn.remaining_refundable)}`}
                        accent="info"
                    />
                    <MetricCard label="Supplier Balance" value={money(purchaseReturn.supplier.balance)} accent="warning" />
                    <MetricCard label="Reason" value={purchaseReturn.reason ?? '—'} />
                </MetricGrid>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Product</th>
                                <th className="px-4 py-2 text-right font-medium">Quantity</th>
                                <th className="px-4 py-2 text-right font-medium">Unit Cost</th>
                                <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseReturn.items.map((item) => (
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
                                <td className="px-4 py-2 text-right tabular-nums">{money(purchaseReturn.total_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <RefundPurchaseReturnModal open={refundOpen} onOpenChange={setRefundOpen} purchaseReturn={purchaseReturn} accounts={accounts} />
        </AppLayout>
    );
}
