import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getPurchaseActions } from '@/components/purchases/purchase-actions';
import { humanize, purchasePaymentVariant, purchaseStatusVariant } from '@/components/purchases/purchase-columns';
import ContactLink from '@/components/shared/contact-link';
import { Badge } from '@/components/ui/badge';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { type PurchaseListItem } from '@/types/models';
import { Link } from '@inertiajs/react';
import { ShoppingBag } from 'lucide-react';

interface PurchaseGridCardProps {
    purchase: PurchaseListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onDelete: (purchase: PurchaseListItem) => void;
}

/** One purchase as a card — the grid view and the mobile list. The left edge colour shows paid / due at a glance. */
export function PurchaseGridCard({ purchase, selected, onToggleSelected, onDelete }: PurchaseGridCardProps) {
    const money = useMoneyFormat();

    const isPaid = purchase.payment_status === 'paid';
    const isDue = purchase.payment_status === 'due' || purchase.due_amount > 0;
    const accentBorder = isPaid ? 'border-l-emerald-500' : isDue ? 'border-l-rose-500' : 'border-l-purple-500';

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
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/20 dark:text-purple-400">
                        <ShoppingBag className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <Link
                            href={route('purchases.show', purchase.id)}
                            className="text-foreground block truncate font-semibold underline-offset-2 hover:underline"
                        >
                            {purchase.invoice_no}
                        </Link>
                        <div className="text-muted-foreground truncate text-xs">
                            <ContactLink id={purchase.supplier.id} name={purchase.supplier.name} />
                        </div>
                        <div className="text-muted-foreground truncate text-xs">{formatDateTime(purchase.created_at ?? purchase.purchase_date)}</div>
                    </div>
                </div>
                <DataTableRowActions actions={getPurchaseActions(purchase, { onDelete })} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <div className="flex flex-wrap items-center gap-1">
                    <Badge variant={purchasePaymentVariant[purchase.payment_status]}>{humanize(purchase.payment_status)}</Badge>
                    <Badge variant={purchaseStatusVariant[purchase.status]}>{humanize(purchase.status)}</Badge>
                </div>
                <div className="text-right">
                    <div className="text-foreground font-semibold tabular-nums">{money(purchase.total_amount)}</div>
                    {purchase.due_amount > 0 && (
                        <div className="text-xs font-medium text-rose-600 tabular-nums dark:text-rose-400">Due: {money(purchase.due_amount)}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
