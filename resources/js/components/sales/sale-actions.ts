import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type SaleListItem } from '@/types/models';
import { Eye, MessageCircle, Pencil, Printer, Receipt, RotateCcw, Trash2, Wallet } from 'lucide-react';

interface SaleActionHandlers {
    onDelete: (sale: SaleListItem) => void;
    onAddPayment: (sale: SaleListItem) => void;
    onViewPayments: (sale: SaleListItem) => void;
}

/**
 * Row actions shared by the table's action menu and the mobile card.
 *
 * "Edit Shipping", "Delivery Challan"/"Delivery Note" and "Invoice URL" are
 * intentionally absent — there's no schema/routes for them yet (no shipping
 * fields on `sales`, no delivery-document template, no public/signed invoice
 * link), so adding them is a schema/route change, not a UI-only one.
 */
export function getSaleActions(sale: SaleListItem, { onDelete, onAddPayment, onViewPayments }: SaleActionHandlers): RowAction[] {
    return [
        { label: 'View', icon: Eye, href: route('sales.show', sale.id) },
        { label: 'Edit', icon: Pencil, href: route('sales.edit', sale.id), hidden: !sale.can_edit },
        {
            label: 'Print Invoice',
            icon: Printer,
            onClick: () => window.open(route('sales.show', { sale: sale.id, print: 1 }), '_blank', 'noopener,noreferrer'),
        },
        {
            label: 'Add Payment',
            icon: Wallet,
            onClick: () => onAddPayment(sale),
            hidden: !(sale.status === 'confirmed' && sale.due_amount > 0),
        },
        { label: 'View Payments', icon: Receipt, onClick: () => onViewPayments(sale), hidden: sale.status !== 'confirmed' },
        {
            label: 'Sale Return',
            icon: RotateCcw,
            href: `/sale-returns/create?sale_id=${sale.id}`,
            hidden: sale.status !== 'confirmed',
        },
        {
            label: 'Send WhatsApp Notification',
            icon: MessageCircle,
            href: route('sales.show', { sale: sale.id, whatsapp: 1 }),
            hidden: sale.status !== 'confirmed',
        },
        { label: 'Delete', icon: Trash2, variant: 'destructive', separatorBefore: true, onClick: () => onDelete(sale), hidden: !sale.can_edit },
    ];
}
