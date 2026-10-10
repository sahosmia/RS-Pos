import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getSalesOrderActions } from '@/components/sales/sales-order-actions';
import ContactLink from '@/components/shared/contact-link';
import { StatusBadge } from '@/components/shared/status-badge';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDate } from '@/lib/format-date';
import { type SalesOrderListItem } from '@/types/models';
import { Link } from '@inertiajs/react';

interface SalesOrderGridCardProps {
    order: SalesOrderListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
}

/** One sales order as a card — the grid view and the mobile list. */
export function SalesOrderGridCard({ order, selected, onToggleSelected }: SalesOrderGridCardProps) {
    const money = useMoneyFormat();

    return (
        <div className="rounded-brand-card bg-card p-3 shadow-[var(--brand-card-shadow-elevated)]">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <div className="min-w-0">
                        <Link href={route('sales-orders.show', order.id)} className="truncate font-medium underline-offset-2 hover:underline">
                            {order.order_no}
                        </Link>
                        <div className="text-muted-foreground text-xs">
                            <ContactLink id={order.customer.id} name={order.customer.name} />
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <span className="font-medium tabular-nums">{money(order.total_amount)}</span>
                    <DataTableRowActions actions={getSalesOrderActions(order)} />
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(order.order_date)}
                    {order.due_amount > 0 && ` · Due ${money(order.due_amount)}`}
                </span>
                <StatusBadge status={order.status} />
            </div>
        </div>
    );
}
