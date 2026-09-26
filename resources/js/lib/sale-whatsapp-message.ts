/**
 * Turns a Bangladeshi local number ("01712345678") into the digits-only,
 * country-code-prefixed form `wa.me` needs ("8801712345678"). Already-
 * international numbers (with or without a leading `+`) pass through as-is.
 */
export function toWhatsappNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    if (digits.startsWith('0')) {
        return `880${digits.slice(1)}`;
    }

    return digits;
}

/** Opens WhatsApp Web/App with the message prefilled — the person still has to hit Send themselves (`wa.me`'s click-to-chat link, not a send-on-behalf-of API; this project has no WhatsApp Business API credentials configured). */
export function openWhatsapp(phone: string, message: string): void {
    window.open(`https://wa.me/${toWhatsappNumber(phone)}?text=${encodeURIComponent(message)}`, '_blank');
}

export interface SaleWhatsappItem {
    name: string;
    quantity: number;
    unitPrice: number;
}

export interface SaleWhatsappInput {
    customerName: string;
    invoiceNo: string;
    saleDate: string;
    items: SaleWhatsappItem[];
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    /** This invoice's own unpaid portion — 0 once it's fully paid. */
    saleDueAmount: number;
    /** The customer's total due across every invoice, before this sale. */
    oldDue: number;
    /** The customer's total due across every invoice, after this sale. */
    newTotalDue: number;
}

/**
 * Builds the "Save & WhatsApp" / "New Sale Notification" message — same
 * builder for both, since a notification sent later about an already-saved
 * sale should read identically to one sent right after saving it.
 */
export function buildSaleWhatsappMessage(input: SaleWhatsappInput, money: (amount: number) => string): string {
    const itemLines = input.items.map((item) => `• ${item.name} x${item.quantity} = ${money(item.quantity * item.unitPrice)}`).join('\n');

    const lines = [
        `আসসালামু আলাইকুম, ${input.customerName}`,
        '',
        `আপনার অর্ডার সম্পন্ন হয়েছে ✅`,
        `Invoice: #${input.invoiceNo}`,
        `তারিখ: ${input.saleDate}`,
        '',
        'পণ্যসমূহ:',
        itemLines,
        '',
        `সাবটোটাল: ${money(input.subtotal)}`,
    ];

    if (input.discountAmount > 0) {
        lines.push(`ডিসকাউন্ট: -${money(input.discountAmount)}`);
    }

    lines.push(`মোট: ${money(input.totalAmount)}`, '');

    if (input.oldDue > 0) {
        lines.push(`পূর্বের বাকি: ${money(input.oldDue)}`);
    }

    lines.push(
        input.saleDueAmount > 0 ? `এই ইনভয়েসের বাকি: ${money(input.saleDueAmount)}` : 'এই ইনভয়েসে কোনো বাকি নেই ✅',
        `সর্বমোট বাকি: ${money(input.newTotalDue)}`,
        '',
        'আমাদের সাথে থাকার জন্য ধন্যবাদ।',
    );

    return lines.join('\n');
}
