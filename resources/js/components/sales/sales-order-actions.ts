import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type SalesOrderListItem } from '@/types/models';
import { Eye } from 'lucide-react';

/** Row actions shared by the table's action menu and the mobile card. No edit/delete route exists for sales orders today. */
export function getSalesOrderActions(order: SalesOrderListItem): RowAction[] {
    return [{ label: 'View', icon: Eye, href: route('sales-orders.show', order.id) }];
}
