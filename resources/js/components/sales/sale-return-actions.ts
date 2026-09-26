import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type SaleReturnListItem } from '@/types/models';
import { Eye } from 'lucide-react';

/**
 * Row actions shared by the table's action menu and the mobile card. A sale
 * return is immutable once created (see `SaleReturn` model) — no Edit/Delete,
 * just a redundant "View" alongside the invoice-number link, matching
 * Purchases/Sales/Sales-Orders.
 */
export function getSaleReturnActions(saleReturn: SaleReturnListItem): RowAction[] {
    return [{ label: 'View', icon: Eye, href: route('sale-returns.show', saleReturn.id) }];
}
