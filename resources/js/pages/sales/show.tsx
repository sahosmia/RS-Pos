import HeadingSmall from '@/components/heading-small';
import AddSalePaymentModal from '@/components/sales/add-sale-payment-modal';
import SalePaymentHistoryTable from '@/components/sales/sale-payment-history-table';
import UndoToast from '@/components/sales/undo-toast';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import ContactLink from '@/components/shared/contact-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { buildSaleWhatsappMessage, openWhatsapp } from '@/lib/sale-whatsapp-message';
import { type BreadcrumbItem } from '@/types';
import { type Account, type InvoiceSettingsConfig, type InvoiceShopInfo, type SaleDetail } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SaleShowProps {
    sale: SaleDetail;
    accounts: Account[];
    justConfirmed: boolean;
    invoiceSettings: InvoiceSettingsConfig;
    invoiceLogoUrl: string | null;
    shop: InvoiceShopInfo;
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function SaleShow({ sale, accounts, justConfirmed, invoiceSettings, invoiceLogoUrl, shop }: SaleShowProps) {
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
                onError: (errors) => toast.error(errors.sale ?? 'Could not cancel the sale — check for errors.'),
                onFinish: () => {
                    setUndoing(false);
                    setShowUndo(false);
                },
            },
        );
    };

    useEffect(() => {
        if (justConfirmed) {
            toast.success('Sale invoice saved successfully.');
        }
    }, [justConfirmed]);

    // The list page lacks the invoice/customer data needed to print or WhatsApp, so it
    // links here with `?print=1`/`?whatsapp=1` and this fires the action once on arrival.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const wantsPrint = params.get('print') === '1';
        const wantsWhatsapp = params.get('whatsapp') === '1';

        if (!wantsPrint && !wantsWhatsapp) return;

        if (wantsPrint) {
            window.print();
        }

        if (wantsWhatsapp) {
            if (!sale.customer.phone) {
                toast.error('এই গ্রাহকের কোনো ফোন নাম্বার নেই — হোয়াটসঅ্যাপ পাঠানো যাবে না।');
            } else {
                openWhatsapp(
                    sale.customer.phone,
                    buildSaleWhatsappMessage(
                        {
                            customerName: sale.customer.name,
                            invoiceNo: sale.invoice_no,
                            saleDate: sale.sale_date,
                            items: sale.items.map((item) => ({ name: item.product.name, quantity: item.quantity, unitPrice: item.unit_price })),
                            subtotal: sale.subtotal,
                            discountAmount: sale.discount_amount,
                            totalAmount: sale.total_amount,
                            saleDueAmount: sale.due_amount,
                            oldDue: 0,
                            newTotalDue: Math.max(sale.customer.balance, 0),
                        },
                        money,
                    ),
                );
            }
        }

        params.delete('print');
        params.delete('whatsapp');
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={sale.invoice_no} />

            <div className="space-y-6 px-4 py-6">
                {(invoiceSettings.general.title ||
                    (invoiceSettings.branding.show_logo && invoiceLogoUrl) ||
                    invoiceSettings.business.show_name ||
                    invoiceSettings.business.show_address ||
                    invoiceSettings.business.show_phone) && (
                    <div className="flex items-start justify-between gap-4 border-b pb-4">
                        <div className="space-y-1">
                            {invoiceSettings.general.title && <h2 className="text-2xl font-bold tracking-tight">{invoiceSettings.general.title}</h2>}
                            {invoiceSettings.general.subtitle && <p className="text-muted-foreground text-sm">{invoiceSettings.general.subtitle}</p>}
                        </div>
                        <div className="flex flex-col items-end text-right">
                            {invoiceSettings.branding.show_logo && invoiceLogoUrl && (
                                <img src={invoiceLogoUrl} alt={shop.name} className="mb-1 h-14 w-auto shrink-0 object-contain" />
                            )}
                            {(invoiceSettings.business.show_name || invoiceSettings.business.show_address || invoiceSettings.business.show_phone) && (
                                <div className="text-sm">
                                    {invoiceSettings.business.show_name && shop.name && <p className="font-semibold">{shop.name}</p>}
                                    {invoiceSettings.business.show_address && shop.address && <p className="text-muted-foreground">{shop.address}</p>}
                                    {invoiceSettings.business.show_phone && shop.phone && <p className="text-muted-foreground">{shop.phone}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-b pb-4 text-sm">
                    <div>
                        {(invoiceSettings.customer.show_name ||
                            (invoiceSettings.customer.show_phone && sale.customer.phone) ||
                            (invoiceSettings.customer.show_email && sale.customer.email) ||
                            (invoiceSettings.customer.show_address && sale.customer.address)) && (
                            <div className="space-y-0.5">
                                <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Customer Details</p>
                                {invoiceSettings.customer.show_name && <p className="font-medium">{sale.customer.name}</p>}
                                {invoiceSettings.customer.show_phone && sale.customer.phone && <p className="text-muted-foreground">{sale.customer.phone}</p>}
                                {invoiceSettings.customer.show_email && sale.customer.email && <p className="text-muted-foreground">{sale.customer.email}</p>}
                                {invoiceSettings.customer.show_address && sale.customer.address && <p className="text-muted-foreground">{sale.customer.address}</p>}
                            </div>
                        )}
                    </div>
                    <div>
                        {(invoiceSettings.general.show_number || invoiceSettings.general.show_date) && (
                            <div className="space-y-0.5 sm:text-right">
                                <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Order Details</p>
                                {invoiceSettings.general.show_number && (
                                    <p>
                                        <span className="text-muted-foreground">Invoice No: </span>
                                        <span className="font-medium">{sale.invoice_no}</span>
                                    </p>
                                )}
                                {invoiceSettings.general.show_date && (
                                    <p>
                                        <span className="text-muted-foreground">Date: </span>
                                        <span>{sale.sale_date}</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
                    <HeadingSmall
                        title={sale.invoice_no}
                        description={
                            <>
                                <ContactLink id={sale.customer.id} name={sale.customer.name} /> • {sale.sale_date}
                                {sale.creator && ` • Added by: ${sale.creator.name}`}
                            </>
                        }
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{humanize(sale.status)}</Badge>
                        <Badge variant="outline">{humanize(sale.payment_status)}</Badge>
                        {sale.source === 'imported' && <Badge variant="outline">Historical</Badge>}

                        <Button
                            variant="outline"
                            onClick={() => window.open(`${route('sales.show', sale.id)}?print=1`, '_blank', 'noopener,noreferrer')}
                        >
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

                {/* On-screen quick-glance only — the invoice's own printable totals live in the item table's tfoot below. */}
                <div className="grid gap-4 sm:grid-cols-4 print:hidden">
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
                                            {item.product.name}
                                            {invoiceSettings.items.show_sku && <span className="text-muted-foreground"> ({item.product.sku})</span>}
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
                                    <td className="px-4 py-2 text-right tabular-nums">
                                        {item.quantity}
                                        {invoiceSettings.items.show_unit && item.product.unit && (
                                            <span className="text-muted-foreground"> {item.product.unit.name}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">
                                        {money(item.unit_price)}
                                        {invoiceSettings.items.show_discount && item.discount_amount > 0 && (
                                            <div className="text-muted-foreground text-xs">
                                                Discount {item.discount_type === 'percentage' ? `(${item.discount_value}%)` : ''}: -
                                                {money(item.discount_amount)}
                                            </div>
                                        )}
                                    </td>
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
                            {invoiceSettings.totals.show_discount && sale.discount_amount > 0 && (
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
                            {invoiceSettings.totals.show_paid && (
                                <tr>
                                    <td colSpan={3} className="text-muted-foreground px-4 py-2 text-right">
                                        Paid
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(sale.paid_amount)}</td>
                                </tr>
                            )}
                            {invoiceSettings.totals.show_due && (
                                <tr>
                                    <td colSpan={3} className="text-muted-foreground px-4 py-2 text-right">
                                        Due
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(sale.due_amount)}</td>
                                </tr>
                            )}
                        </tfoot>
                    </table>
                </div>

                {sale.payment_history.length > 0 && (
                    <div className="space-y-2 print:hidden">
                        <h3 className="font-medium">Payment History</h3>
                        <SalePaymentHistoryTable rows={sale.payment_history} />
                    </div>
                )}

                {invoiceSettings.terms.enabled && invoiceSettings.terms.items.length > 0 && (
                    <div className="space-y-1 border-t pt-4 text-sm">
                        <h3 className="font-medium">Terms &amp; Conditions</h3>
                        <ol className="text-muted-foreground list-inside list-decimal space-y-0.5">
                            {invoiceSettings.terms.items.map((term, index) => (
                                <li key={index}>{term}</li>
                            ))}
                        </ol>
                    </div>
                )}

                {invoiceSettings.footer.enabled && invoiceSettings.footer.text && (
                    <div className="text-muted-foreground border-t pt-4 text-center text-sm">{invoiceSettings.footer.text}</div>
                )}
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
