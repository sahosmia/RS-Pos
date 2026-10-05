import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { type ContactLedgerEntry } from '@/types/models';
import { Link } from '@inertiajs/react';
import { TriangleAlert } from 'lucide-react';
import { Fragment } from 'react';

/** Which `.show` route (if any) a ledger entry's `reference_type` links to — matches the strings `LedgerService::recordContact` callers pass. */
const SHOW_ROUTE_BY_REFERENCE_TYPE: Record<string, string> = {
    sale: 'sales.show',
    purchase: 'purchases.show',
    sale_return: 'sale-returns.show',
    purchase_return: 'purchase-returns.show',
    sales_order: 'sales-orders.show',
};

/** A return row is a signal worth flagging at a glance — something already delivered/billed came back. */
const RETURN_TYPES = ['sale_return', 'purchase_return'];

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

interface ContactLedgerTableProps {
    rows: ContactLedgerEntry[];
}

/**
 * Richer than the generic `LedgerTable` — a customer/supplier's ledger needs
 * to answer "which invoice was this" (reference no, linked to the actual
 * sale/purchase/return) and "what was in it" (product line items), not just
 * an amount and running balance.
 */
export default function ContactLedgerTable({ rows }: ContactLedgerTableProps) {
    const money = useMoneyFormat();

    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                        <th className="px-4 py-2 text-left font-medium">Reference No</th>
                        <th className="px-4 py-2 text-left font-medium">Type</th>
                        <th className="px-4 py-2 text-right font-medium">Debit</th>
                        <th className="px-4 py-2 text-right font-medium">Credit</th>
                        <th className="px-4 py-2 text-right font-medium">Balance</th>
                        <th className="px-4 py-2 text-left font-medium">Others</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const routeName = row.reference_type ? SHOW_ROUTE_BY_REFERENCE_TYPE[row.reference_type] : undefined;
                        const isReturn = RETURN_TYPES.includes(row.type);

                        return (
                            <Fragment key={row.id}>
                                <tr className={cn('border-t', isReturn && 'bg-red-50 dark:bg-red-500/5')}>
                                    <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                                    <td className="px-4 py-2">
                                        {row.reference_label ? (
                                            routeName ? (
                                                <Link href={route(routeName, row.reference_id!)} className="underline-offset-2 hover:underline">
                                                    {row.reference_label}
                                                </Link>
                                            ) : (
                                                row.reference_label
                                            )
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={cn('inline-flex items-center gap-1', isReturn && 'font-medium text-red-600 dark:text-red-400')}
                                        >
                                            {isReturn && <TriangleAlert className="size-3.5" />}
                                            {humanize(row.type)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{row.amount > 0 ? money(row.amount) : ''}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{row.amount < 0 ? money(Math.abs(row.amount)) : ''}</td>
                                    <td className="px-4 py-2 text-right font-medium tabular-nums">{money(row.balance)}</td>
                                    <td className="px-4 py-2">{row.note ?? '—'}</td>
                                </tr>

                                {row.items.length > 0 && (
                                    <tr className={cn('border-t', isReturn ? 'bg-red-50/60 dark:bg-red-500/5' : 'bg-muted/20')}>
                                        <td colSpan={7} className="px-4 py-2">
                                            <table className="w-full text-xs">
                                                <thead className="text-muted-foreground">
                                                    <tr>
                                                        <th className="w-8 py-1 text-left font-medium">#</th>
                                                        <th className="py-1 text-left font-medium">Product</th>
                                                        <th className="py-1 text-right font-medium">Quantity</th>
                                                        <th className="py-1 text-right font-medium">Unit Price</th>
                                                        <th className="py-1 text-right font-medium">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {row.items.map((item, index) => (
                                                        <tr key={index}>
                                                            <td className="py-1">{index + 1}</td>
                                                            <td className="py-1">{item.product}</td>
                                                            <td className="py-1 text-right tabular-nums">{item.quantity}</td>
                                                            <td className="py-1 text-right tabular-nums">{money(item.unit_price)}</td>
                                                            <td className="py-1 text-right tabular-nums">{money(item.subtotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t font-medium">
                                                        <td className="py-1" colSpan={4}>
                                                            Total
                                                        </td>
                                                        <td className="py-1 text-right tabular-nums">
                                                            {money(row.items.reduce((sum, item) => sum + item.subtotal, 0))}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
