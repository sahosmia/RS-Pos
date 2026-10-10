import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDate } from '@/lib/format-date';
import { type DashboardSalesOrders } from '@/types/models';
import { Link } from '@inertiajs/react';
import { ClipboardList } from 'lucide-react';

/** Orders booked but not yet confirmed as a sale. The page only renders this when there is at least one. */
export function SalesOrdersWidget({ salesOrders }: { salesOrders: DashboardSalesOrders }) {
    const money = useMoneyFormat();

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <ClipboardList className="size-4 text-teal-500" />
                        Sales orders waiting
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">
                        {salesOrders.count} to confirm · {money(salesOrders.total)} · advance taken {money(salesOrders.advance)}
                    </p>
                </div>
                <Link href={route('sales-orders.index')} className="text-muted-foreground hover:text-foreground text-xs">
                    View all
                </Link>
            </CardHeader>
            <CardContent className="divide-border/40 divide-y p-0">
                {salesOrders.items.map((order) => (
                    <div key={order.id} className="hover:bg-muted/30 flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors">
                        <Link href={route('sales-orders.show', order.id)} className="min-w-0 flex-1">
                            <p className="truncate font-medium">{order.customer}</p>
                            <p className="text-muted-foreground truncate text-xs tabular-nums">
                                {order.order_no}
                                {order.expected_delivery_date && ` · delivery ${formatDate(order.expected_delivery_date)}`}
                            </p>
                        </Link>
                        <div className="shrink-0 text-right">
                            <p className="font-semibold tabular-nums">{money(order.total_amount)}</p>
                            {order.due_amount > 0 && <p className="text-muted-foreground text-xs tabular-nums">Due {money(order.due_amount)}</p>}
                        </div>
                        <Link href={route('sales-orders.confirm', order.id)} className="text-primary shrink-0 text-xs font-medium hover:underline">
                            Confirm
                        </Link>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
