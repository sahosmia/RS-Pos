import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { type SalePaymentHistoryEntry } from '@/types/models';

interface SalePaymentHistoryTableProps {
    rows: SalePaymentHistoryEntry[];
}

/**
 * Shared by the Sales list's "View Payments" modal and the sale detail
 * page's own Payment History section — both read the same
 * `SalePaymentHistory::forSale()` shape, so the table markup lives once.
 * A refund (from a return against this sale) shows red/negative so it reads
 * as money going back out, not another payment coming in.
 */
export default function SalePaymentHistoryTable({ rows }: SalePaymentHistoryTableProps) {
    const money = useMoneyFormat();

    if (rows.length === 0) {
        return <p className="text-muted-foreground py-6 text-center text-sm">No payments recorded yet.</p>;
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                        <th className="px-4 py-2 text-left font-medium">Type</th>
                        <th className="px-4 py-2 text-left font-medium">Account</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id} className="border-t">
                            <td className="px-4 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                            <td className={cn('px-4 py-2', row.kind === 'refund' && 'text-red-600 dark:text-red-400')}>
                                {row.kind === 'refund' ? 'Refund' : 'Payment'}
                            </td>
                            <td className="px-4 py-2">{row.account}</td>
                            <td className={cn('px-4 py-2 text-right tabular-nums', row.kind === 'refund' && 'text-red-600 dark:text-red-400')}>
                                {row.kind === 'refund' ? '-' : ''}
                                {money(row.amount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
