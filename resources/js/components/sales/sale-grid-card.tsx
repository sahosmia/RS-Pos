import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getSaleActions } from '@/components/sales/sale-actions';
import ContactLink from '@/components/shared/contact-link';
import { Badge } from '@/components/ui/badge';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { humanize, paymentStatusColor, statusColor } from '@/pages/sales/table/columns';
import { type SaleListItem } from '@/types/models';
import { Link } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';

interface SaleGridCardProps {
    sale: SaleListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    handlers: Parameters<typeof getSaleActions>[1];
}

/** One sale as a card — the grid view and the mobile list. The left edge colour shows paid / due at a glance. */
export function SaleGridCard({ sale, selected, onToggleSelected, handlers }: SaleGridCardProps) {
    const money = useMoneyFormat();

    const isPaid = sale.payment_status === 'paid';
    const isDue = sale.payment_status === 'due' || sale.due_amount > 0;
    const accentBorder = isPaid ? 'border-l-emerald-500' : isDue ? 'border-l-rose-500' : 'border-l-amber-500';

    return (
        <div
            className={cn(
                'group bg-card hover:border-primary/30 rounded-xl border border-l-4 p-4 transition-all hover:shadow-md',
                accentBorder,
                selected && 'border-primary/40 bg-primary/5 ring-primary/20 ring-1',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} className="mt-1" />
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400">
                        <ShoppingCart className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                                href={route('sales.show', sale.id)}
                                className="text-foreground truncate font-semibold underline-offset-2 hover:underline"
                            >
                                {sale.invoice_no}
                            </Link>
                            {sale.source === 'imported' && (
                                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                                    Historical
                                </Badge>
                            )}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                            <ContactLink id={sale.customer.id} name={sale.customer.name} />
                        </div>
                        <div className="text-muted-foreground truncate text-xs">{formatDateTime(sale.created_at ?? sale.sale_date)}</div>
                    </div>
                </div>
                <DataTableRowActions actions={getSaleActions(sale, handlers)} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className={paymentStatusColor[sale.payment_status]}>
                        {humanize(sale.payment_status)}
                    </Badge>
                    <Badge variant="outline" className={statusColor[sale.status]}>
                        {humanize(sale.status)}
                    </Badge>
                </div>
                <div className="text-right">
                    <div className="text-foreground font-semibold tabular-nums">{money(sale.total_amount)}</div>
                    {sale.due_amount > 0 && (
                        <div className="text-xs font-medium text-rose-600 tabular-nums dark:text-rose-400">Due: {money(sale.due_amount)}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
