import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type PurchaseReturnListItem } from '@/types/models';
import { Eye } from 'lucide-react';

/**
 * Row actions shared by the table's action menu and the mobile card. A
 * purchase return is immutable once created (see `PurchaseReturn` model) —
 * no Edit/Delete, just a redundant "View" alongside the invoice-number link,
 * matching Purchases/Sales/Sales-Orders.
 */
export function getPurchaseReturnActions(purchaseReturn: PurchaseReturnListItem): RowAction[] {
    return [{ label: 'View', icon: Eye, href: route('purchase-returns.show', purchaseReturn.id) }];
}
