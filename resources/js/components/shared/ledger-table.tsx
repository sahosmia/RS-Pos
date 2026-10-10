import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDateTime } from '@/lib/format-date';

export interface LedgerRow {
    id: number | string;
    date: string;
    description: string;
    /** Signed: positive is money in, negative is money out. */
    amount: number;
    balance: number;
    /** Name of the user who recorded this line — when any row has it, an "Added by" column appears. */
    by?: string | null;
}

interface LedgerTableProps {
    rows: LedgerRow[];
    broughtForward?: number;
    broughtForwardLabel?: string;
}

export default function LedgerTable({ rows, broughtForward, broughtForwardLabel = 'Brought forward' }: LedgerTableProps) {
    const money = useMoneyFormat();
    const showBy = rows.some((row) => row.by !== undefined);

    return (
        <div className="overflow-x-auto rounded-brand-card bg-card shadow-[var(--brand-card-shadow-elevated)]">
            <table className="w-full text-sm">
                <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                    <tr>
                        <th className="px-4 py-2.5 text-left font-medium">Date</th>
                        <th className="px-4 py-2.5 text-left font-medium">Description</th>
                        <th className="px-4 py-2.5 text-right font-medium">In</th>
                        <th className="px-4 py-2.5 text-right font-medium">Out</th>
                        <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                        {showBy && <th className="px-4 py-2.5 text-left font-medium">Added by</th>}
                    </tr>
                </thead>
                <tbody>
                    {broughtForward !== undefined && (
                        <tr className="border-brand-table-divider text-muted-foreground border-t">
                            <td className="px-4 py-2" colSpan={4}>
                                {broughtForwardLabel}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{money(broughtForward)}</td>
                            {showBy && <td />}
                        </tr>
                    )}

                    {rows.map((row) => (
                        <tr key={row.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
                            <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(row.date)}</td>
                            <td className="px-4 py-2">{row.description}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{row.amount > 0 ? money(row.amount) : ''}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{row.amount < 0 ? money(Math.abs(row.amount)) : ''}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{money(row.balance)}</td>
                            {showBy && <td className="text-muted-foreground px-4 py-2 whitespace-nowrap">{row.by ?? '—'}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
