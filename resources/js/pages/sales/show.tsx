import HeadingSmall from '@/components/heading-small';
import AddSalePaymentModal from '@/components/sales/add-sale-payment-modal';
import { SaleEmiPlan } from '@/components/sales/sale-emi-plan';
import SalePaymentHistoryTable from '@/components/sales/sale-payment-history-table';
import { SaleSerialList } from '@/components/sales/sale-serial-list';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import ContactLink from '@/components/shared/contact-link';
import { MetricCard } from '@/components/shared/metric-card';
import { StatusBadge } from '@/components/shared/status-badge';
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
    invoiceShop: InvoiceShopInfo;
}

export default function SaleShow({ sale, accounts, invoiceSettings, invoiceLogoUrl, invoiceShop: shop }: SaleShowProps) {
    const money = useMoneyFormat();
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelProcessing, setCancelProcessing] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sales', href: '/sales' },
        { title: sale.invoice_no, href: `/sales/${sale.id}` },
    ];

    const confirmDelete = () => {
        router.delete(route('sales.destroy', sale.id), {
            onFinish: () => setDeleting(false),
        });
    };

    // Cancelling reverses the whole sale (stock, due, payments, the books) and keeps it on file as Cancelled.
    const confirmCancel = () => {
        setCancelProcessing(true);
        router.post(
            route('sales.cancel', sale.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Sale cancelled.'),
                onError: (errors) => toast.error(errors.sale ?? 'Could not cancel the sale — check for errors.'),
                onFinish: () => {
                    setCancelProcessing(false);
                    setCancelling(false);
                },
            },
        );
    };

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
                                <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">Customer Details</p>
                                {invoiceSettings.customer.show_name && <p className="font-medium">{sale.customer.name}</p>}
                                {invoiceSettings.customer.show_phone && sale.customer.phone && (
                                    <p className="text-muted-foreground">{sale.customer.phone}</p>
                                )}
                                {invoiceSettings.customer.show_email && sale.customer.email && (
                                    <p className="text-muted-foreground">{sale.customer.email}</p>
                                )}
                                {invoiceSettings.customer.show_address && sale.customer.address && (
                                    <p className="text-muted-foreground">{sale.customer.address}</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div>
                        {(invoiceSettings.general.show_number || invoiceSettings.general.show_date) && (
                            <div className="space-y-0.5 sm:text-right">
                                <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">Order Details</p>
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
                        <StatusBadge status={sale.status} />
                        <StatusBadge status={sale.payment_status} />
                        {sale.source === 'imported' && <Badge variant="neutral">Historical</Badge>}

                        <Button
                            variant="outline"
                            onClick={() => window.open(`${route('sales.show', sale.id)}?print=1`, '_blank', 'noopener,noreferrer')}
                        >
                            Print
                        </Button>

                        {(sale.can_edit || sale.can_amend) && (
                            <Button variant="outline" asChild>
                                <Link href={route('sales.edit', sale.id)}>Edit</Link>
                            </Button>
                        )}
                        {sale.can_edit && (
                            <Button variant="outline" onClick={() => setDeleting(true)}>
                                Delete
                            </Button>
                        )}

                        {sale.status === 'confirmed' && (
                            <Button variant="outline" asChild>
                                <Link href={`/sale-returns/create?sale_id=${sale.id}`}>Return</Link>
                            </Button>
                        )}

                        {sale.status === 'confirmed' && sale.can_amend && (
                            <Button variant="outline" onClick={() => setCancelling(true)}>
                                Cancel Sale
                            </Button>
                        )}

                        {sale.status === 'confirmed' && sale.due_amount > 0 && <Button onClick={() => setPaymentOpen(true)}>Add Payment</Button>}
                    </div>
                </div>

                {/* On-screen quick-glance only — the invoice's own printable totals live in the item table's tfoot below. */}
                <div className="grid gap-4 sm:grid-cols-4 print:hidden">
                    <MetricCard label="Total" value={money(sale.total_amount)} />
                    <MetricCard label="Paid" value={money(sale.paid_amount)} />
                    <MetricCard label="Due" value={money(sale.due_amount)} />
                    <MetricCard label="Customer Balance" value={money(sale.customer.balance)} />
                </div>

                {sale.emi && (
                    <SaleEmiPlan
                        emi={sale.emi}
                        accounts={accounts}
                        invoiceNo={sale.invoice_no}
                        customerName={sale.customer.name}
                        customerPhone={sale.customer.phone}
                    />
                )}

                <div className="rounded-brand-card bg-card overflow-x-auto shadow-[var(--brand-card-shadow-elevated)]">
                    <table className="w-full text-sm">
                        <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium">Product</th>
                                <th className="px-4 py-2.5 text-right font-medium">Quantity</th>
                                <th className="px-4 py-2.5 text-right font-medium">Price</th>
                                <th className="px-4 py-2.5 text-right font-medium">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sale.items.map((item) => (
                                <tr
                                    key={item.id}
                                    className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t align-top"
                                >
                                    <td className="px-4 py-2">
                                        <div>
                                            {item.product.name}
                                            {invoiceSettings.items.show_sku && <span className="text-muted-foreground"> ({item.product.sku})</span>}
                                        </div>
                                        {sale.emi && <div className="text-muted-foreground text-xs">{item.emi_financed ? 'On EMI' : 'Paid now'}</div>}
                                        {item.installation_required && (
                                            <div className="text-muted-foreground text-xs">Installation: {money(item.installation_charge ?? 0)}</div>
                                        )}
                                        {item.warranty_expires_at && (
                                            <div className="text-muted-foreground text-xs">
                                                Warranty {item.warranty_months ? ` months, ` : ''}until {item.warranty_expires_at}
                                            </div>
                                        )}
                                        <SaleSerialList
                                            saleId={sale.id}
                                            itemId={item.id}
                                            serials={item.serials}
                                            confirmed={sale.status === 'confirmed'}
                                        />
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
                            <tr className="border-brand-table-divider border-t">
                                <td colSpan={3} className="text-muted-foreground px-4 py-2 text-right">
                                    Subtotal
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(sale.subtotal)}</td>
                            </tr>
                            {sale.installation_amount > 0 && (
                                <tr>
                                    <td colSpan={3} className="text-muted-foreground px-4 py-2 text-right">
                                        Installation
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">+{money(sale.installation_amount)}</td>
                                </tr>
                            )}
                            {invoiceSettings.totals.show_discount && sale.discount_amount > 0 && (
                                <tr>
                                    <td colSpan={3} className="text-muted-foreground px-4 py-2 text-right">
                                        Discount {sale.discount_type === 'percentage' ? `(${sale.discount_value}%)` : ''}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">-{money(sale.discount_amount)}</td>
                                </tr>
                            )}
                            {sale.emi && sale.emi.interest_total > 0 && (
                                <tr>
                                    <td colSpan={3} className="text-muted-foreground px-4 py-2 text-right">
                                        EMI interest
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">+{money(sale.emi.interest_total)}</td>
                                </tr>
                            )}
                            <tr className="border-brand-table-divider border-t font-medium">
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
                            {invoiceSettings.totals.show_paid && sale.waived_amount > 0 && (
                                <tr>
                                    <td colSpan={3} className="text-muted-foreground px-4 py-2 text-right">
                                        Discount waived
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(sale.waived_amount)}</td>
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

            <ConfirmDialog
                open={cancelling}
                onOpenChange={setCancelling}
                processing={cancelProcessing}
                title="Cancel this sale?"
                description={`"${sale.invoice_no}" বাতিল হবে: stock ফিরে আসবে, customer-এর due ও নেওয়া payment উল্টে যাবে, হিসাবের খাতাও উল্টানো হবে। Sale-টা Cancelled হিসেবে থেকে যাবে। ভুল ঠিক করতে চাইলে বাতিল না করে Edit ব্যবহার করুন।`}
                confirmLabel="Cancel sale"
                onConfirm={confirmCancel}
            />
        </AppLayout>
    );
}
