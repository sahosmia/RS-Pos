import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type SalesOrderListItem } from '@/types/models';
import { CheckCircle2, Eye } from 'lucide-react';

/** Row actions shared by the table's action menu and the mobile card. Confirm opens the order in the full sale form. */
export function getSalesOrderActions(order: SalesOrderListItem): RowAction[] {
    return [
        ...(order.can_convert ? [{ label: 'Confirm Sale', icon: CheckCircle2, href: route('sales-orders.confirm', order.id) }] : []),
        { label: 'View', icon: Eye, href: route('sales-orders.show', order.id) },
    ];
}
