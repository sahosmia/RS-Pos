import HeadingSmall from '@/components/heading-small';
import AddSalePaymentModal from '@/components/sales/add-sale-payment-modal';
import UndoToast from '@/components/sales/undo-toast';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type SaleDetail } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface SaleShowProps {
    sale: SaleDetail;
    accounts: Account[];
    justConfirmed: boolean;
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function SaleShow({ sale, accounts, justConfirmed }: SaleShowProps) {
    const money = useMoneyFormat();
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [undoing, setUndoing] = useState(false);
    const [showUndo, setShowUndo] = useState(justConfirmed);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sales', href: '/sales' },
        { title: sale.invoice_no, href: `/sales/${sale.id}` },
    ];

    const confirmDelete = () => {
        router.delete(route('sales.destroy', sale.id), {
            onFinish: () => setDeleting(false),
        });
    };

    const undo = () => {
        setUndoing(true);
        router.post(
            route('sales.cancel', sale.id),
            {},
            {
                onFinish: () => {
                    setUndoing(false);
                    setShowUndo(false);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={sale.invoice_no} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
                    <HeadingSmall title={sale.invoice_no} description={`${sale.customer.name} • ${sale.sale_date}`} />

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{humanize(sale.status)}</Badge>
                        <Badge variant="outline">{humanize(sale.payment_status)}</Badge>
                        {sale.source === 'imported' && <Badge variant="outline">Historical</Badge>}

                        <Button variant="outline" onClick={() => window.print()}>
                            Print
                        </Button>

                        {sale.can_edit && (
                            <>
                                <Button variant="outline" asChild>
                                    <Link href={route('sales.edit', sale.id)}>Edit</Link>
                                </Button>
                                <Button variant="outline" onClick={() => setDeleting(true)}>
                                    Delete
                                </Button>
                            </>
                        )}

                        {sale.status === 'confirmed' && (
                            <Button variant="outline" asChild>
                                <Link href={`/sale-returns/create?sale_id=${sale.id}`}>Return</Link>
                            </Button>
                        )}

                        {sale.status === 'confirmed' && sale.due_amount > 0 && <Button onClick={() => setPaymentOpen(true)}>Add Payment</Button>}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Total</p>
                        <p className="text-xl font-semibold tabular-nums">{money(sale.total_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Paid</p>
                        <p className="text-xl font-semibold tabular-nums">{money(sale.paid_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Due</p>
                        <p className="text-xl font-semibold tabular-nums">{money(sale.due_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Customer Balance</p>
                        <p className="text-xl font-semibold tabular-nums">{money(sale.customer.balance)}</p>
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
                            {sale.items.map((item) => (
                                <tr key={item.id} className="border-t align-top">
                                    <td className="px-4 py-2">
                                        <div>
                                            {item.product.name} <span className="text-muted-foreground">({item.product.sku})</span>
                                        </div>
                                        {item.installation_required && (
                                            <div className="text-muted-foreground text-xs">Installation: {money(item.installation_charge ?? 0)}</div>
                                        )}
                                        {item.warranty_expires_at && (
                                            <div className="text-muted-foreground text-xs">Warranty until {item.warranty_expires_at}</div>
                                        )}
                                        {item.serial_numbers.length > 0 && (
                                            <div className="text-muted-foreground text-xs">SN: {item.serial_numbers.join(', ')}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(item.unit_price)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(item.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t">
                                <td colSpan={3} className="text-muted-foreground px-4 py-2 text-right">
                                    Subtotal
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(sale.subtotal)}</td>
                            </tr>
                            {sale.discount_amount > 0 && (
                                <tr>
                                    <td colSpan={3} className="text-muted-foreground px-4 py-2 text-right">
                                        Discount {sale.discount_type === 'percentage' ? `(${sale.discount_value}%)` : ''}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">-{money(sale.discount_amount)}</td>
                                </tr>
                            )}
                            <tr className="border-t font-medium">
                                <td colSpan={3} className="px-4 py-2 text-right">
                                    Total
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(sale.total_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <AddSalePaymentModal open={paymentOpen} onOpenChange={setPaymentOpen} sale={sale} accounts={accounts} />

            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title="Delete sale?"
                description={`"${sale.invoice_no}" মুছে ফেলা হবে।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />

            {showUndo && sale.status === 'confirmed' && <UndoToast onUndo={undo} processing={undoing} />}
        </AppLayout>
    );
}
