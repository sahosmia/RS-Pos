import HeadingSmall from '@/components/heading-small';
import AddPaymentModal from '@/components/purchases/add-payment-modal';
import ConfirmPurchaseModal from '@/components/purchases/confirm-purchase-modal';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type PurchaseDetail } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface PurchaseShowProps {
    purchase: PurchaseDetail;
    accounts: Account[];
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function PurchaseShow({ purchase, accounts }: PurchaseShowProps) {
    const money = useMoneyFormat();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Purchases', href: '/purchases' },
        { title: purchase.invoice_no, href: `/purchases/${purchase.id}` },
    ];

    const confirmDelete = () => {
        router.delete(route('purchases.destroy', purchase.id), {
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={purchase.invoice_no} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
                    <HeadingSmall title={purchase.invoice_no} description={`${purchase.supplier.name} • ${purchase.purchase_date}`} />

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{humanize(purchase.status)}</Badge>
                        <Badge variant="outline">{humanize(purchase.payment_status)}</Badge>

                        <Button variant="outline" onClick={() => window.print()}>
                            Print
                        </Button>

                        {purchase.can_edit && (
                            <>
                                <Button variant="outline" asChild>
                                    <Link href={route('purchases.edit', purchase.id)}>Edit</Link>
                                </Button>
                                <Button variant="outline" onClick={() => setDeleting(true)}>
                                    Delete
                                </Button>
                                <Button onClick={() => setConfirmOpen(true)}>Mark as Received</Button>
                            </>
                        )}

                        {purchase.status === 'received' && purchase.due_amount > 0 && (
                            <Button onClick={() => setPaymentOpen(true)}>Add Payment</Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Total</p>
                        <p className="text-xl font-semibold tabular-nums">{money(purchase.total_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Paid</p>
                        <p className="text-xl font-semibold tabular-nums">{money(purchase.paid_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Due</p>
                        <p className="text-xl font-semibold tabular-nums">{money(purchase.due_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Supplier Balance</p>
                        <p className="text-xl font-semibold tabular-nums">{money(purchase.supplier.balance)}</p>
                    </div>
                </div>

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
                            {purchase.items.map((item) => (
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
                                <td className="px-4 py-2 text-right tabular-nums">{money(purchase.total_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <ConfirmPurchaseModal open={confirmOpen} onOpenChange={setConfirmOpen} purchase={purchase} accounts={accounts} />

            <AddPaymentModal open={paymentOpen} onOpenChange={setPaymentOpen} purchase={purchase} accounts={accounts} />

            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title="Delete purchase?"
                description={`"${purchase.invoice_no}" মুছে ফেলা হবে।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
