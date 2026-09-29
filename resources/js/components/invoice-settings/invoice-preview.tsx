import { useMoneyFormat } from '@/hooks/use-money-format';
import { type InvoiceSettingsConfig, type InvoiceShopInfo } from '@/types/models';

interface InvoicePreviewProps {
    settings: InvoiceSettingsConfig;
    logoPreview: string | null;
    shop: InvoiceShopInfo;
}

/** Fixed dummy data — a live preview shouldn't leak real customer/financial data. */
const SAMPLE = {
    invoiceNo: 'INV-0001',
    date: '2026-09-29',
    customer: { name: 'Rahim Uddin', phone: '01700000000', email: 'rahim@example.com', address: 'Dhanmondi, Dhaka' },
    items: [
        { name: 'Air Conditioner 1.5 Ton', sku: 'AC-150', unit: 'Pcs', quantity: 1, price: 55000, discount: 2000 },
        { name: 'Installation Charge', sku: 'SRV-01', unit: 'Service', quantity: 1, price: 1500, discount: 0 },
    ],
    subtotal: 56500,
    discount: 2000,
    total: 54500,
    paid: 30000,
    due: 24500,
};

export default function InvoicePreview({ settings, logoPreview, shop }: InvoicePreviewProps) {
    const money = useMoneyFormat();

    const hasHeader =
        settings.general.title ||
        (settings.branding.show_logo && logoPreview) ||
        settings.business.show_name ||
        settings.business.show_address ||
        settings.business.show_phone;

    const hasCustomerDetails =
        settings.customer.show_name ||
        settings.customer.show_phone ||
        settings.customer.show_email ||
        settings.customer.show_address;

    const hasOrderDetails =
        settings.general.show_number ||
        settings.general.show_date ||
        settings.general.show_due_date;

    return (
        <div className="space-y-4 rounded-lg border bg-card p-6 text-sm shadow-2xs">
            {hasHeader && (
                <div className="flex items-start justify-between gap-4 border-b pb-4">
                    <div className="space-y-1">
                        {settings.general.title && <h2 className="text-xl font-bold tracking-tight">{settings.general.title}</h2>}
                        {settings.general.subtitle && <p className="text-muted-foreground text-xs">{settings.general.subtitle}</p>}
                    </div>
                    <div className="flex flex-col items-end text-right">
                        {settings.branding.show_logo && logoPreview && (
                            <img src={logoPreview} alt="Logo" className="mb-1 h-12 w-auto shrink-0 object-contain" />
                        )}
                        {(settings.business.show_name || settings.business.show_address || settings.business.show_phone) && (
                            <div className="text-xs">
                                {settings.business.show_name && <p className="font-semibold">{shop.name || 'Your Shop Name'}</p>}
                                {settings.business.show_address && <p className="text-muted-foreground">{shop.address || 'Shop address'}</p>}
                                {settings.business.show_phone && <p className="text-muted-foreground">{shop.phone || '01xxxxxxxxx'}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {(hasCustomerDetails || hasOrderDetails) && (
                <div className="grid grid-cols-2 gap-4 border-b pb-4 text-xs">
                    <div>
                        {hasCustomerDetails && (
                            <div className="space-y-0.5">
                                <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Customer Details</p>
                                {settings.customer.show_name && <p className="font-medium">{SAMPLE.customer.name}</p>}
                                {settings.customer.show_phone && <p className="text-muted-foreground">{SAMPLE.customer.phone}</p>}
                                {settings.customer.show_email && <p className="text-muted-foreground">{SAMPLE.customer.email}</p>}
                                {settings.customer.show_address && <p className="text-muted-foreground">{SAMPLE.customer.address}</p>}
                            </div>
                        )}
                    </div>
                    <div>
                        {hasOrderDetails && (
                            <div className="space-y-0.5 sm:text-right">
                                <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Order Details</p>
                                {settings.general.show_number && (
                                    <p>
                                        <span className="text-muted-foreground">Invoice No: </span>
                                        <span className="font-medium">{SAMPLE.invoiceNo}</span>
                                    </p>
                                )}
                                {settings.general.show_date && (
                                    <p>
                                        <span className="text-muted-foreground">Date: </span>
                                        <span>{SAMPLE.date}</span>
                                    </p>
                                )}
                                {settings.general.show_due_date && (
                                    <p>
                                        <span className="text-muted-foreground">Due Date: </span>
                                        <span>2026-10-15</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="px-3 py-1.5 text-left font-medium">Product</th>
                            <th className="px-3 py-1.5 text-right font-medium">Qty</th>
                            <th className="px-3 py-1.5 text-right font-medium">Price</th>
                            <th className="px-3 py-1.5 text-right font-medium">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SAMPLE.items.map((item) => (
                            <tr key={item.sku} className="border-t align-top">
                                <td className="px-3 py-1.5">
                                    <div>
                                        {item.name}
                                        {settings.items.show_sku && <span className="text-muted-foreground"> ({item.sku})</span>}
                                    </div>
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">
                                    {item.quantity}
                                    {settings.items.show_unit && <span className="text-muted-foreground"> {item.unit}</span>}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">
                                    {money(item.price)}
                                    {settings.items.show_discount && item.discount > 0 && (
                                        <div className="text-muted-foreground">-{money(item.discount)}</div>
                                    )}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{money(item.price * item.quantity - item.discount)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t">
                            <td colSpan={3} className="text-muted-foreground px-3 py-1.5 text-right">
                                Subtotal
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{money(SAMPLE.subtotal)}</td>
                        </tr>
                        {settings.totals.show_discount && (
                            <tr>
                                <td colSpan={3} className="text-muted-foreground px-3 py-1.5 text-right">
                                    Discount
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">-{money(SAMPLE.discount)}</td>
                            </tr>
                        )}
                        <tr className="border-t font-medium">
                            <td colSpan={3} className="px-3 py-1.5 text-right">
                                Total
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{money(SAMPLE.total)}</td>
                        </tr>
                        {settings.totals.show_paid && (
                            <tr>
                                <td colSpan={3} className="text-muted-foreground px-3 py-1.5 text-right">
                                    Paid
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{money(SAMPLE.paid)}</td>
                            </tr>
                        )}
                        {settings.totals.show_due && (
                            <tr>
                                <td colSpan={3} className="text-muted-foreground px-3 py-1.5 text-right">
                                    Due
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{money(SAMPLE.due)}</td>
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>

            {settings.terms.enabled && settings.terms.items.length > 0 && (
                <div className="space-y-1 border-t pt-3">
                    <h3 className="text-xs font-medium">Terms &amp; Conditions</h3>
                    <ol className="text-muted-foreground list-inside list-decimal space-y-0.5 text-xs">
                        {settings.terms.items.map((term, index) => (
                            <li key={index}>{term}</li>
                        ))}
                    </ol>
                </div>
            )}

            {settings.footer.enabled && settings.footer.text && (
                <div className="text-muted-foreground border-t pt-3 text-center text-xs">{settings.footer.text}</div>
            )}
        </div>
    );
}
