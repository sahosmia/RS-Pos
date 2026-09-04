import { useMoneyFormat } from '@/hooks/use-money-format';

export interface LedgerRow {
    id: number | string;
    date: string;
    description: string;
    /** Signed: positive is money in, negative is money out. */
    amount: number;
    balance: number;
}

interface LedgerTableProps {
    rows: LedgerRow[];
    broughtForward?: number;
    broughtForwardLabel?: string;
}

export default function LedgerTable({ rows, broughtForward, broughtForwardLabel = 'Brought forward' }: LedgerTableProps) {
    const money = useMoneyFormat();

    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                        <th className="px-4 py-2 text-left font-medium">Description</th>
                        <th className="px-4 py-2 text-right font-medium">In</th>
                        <th className="px-4 py-2 text-right font-medium">Out</th>
                        <th className="px-4 py-2 text-right font-medium">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {broughtForward !== undefined && (
                        <tr className="text-muted-foreground border-t">
                            <td className="px-4 py-2" colSpan={4}>
                                {broughtForwardLabel}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{money(broughtForward)}</td>
                        </tr>
                    )}

                    {rows.map((row) => (
                        <tr key={row.id} className="border-t">
                            <td className="px-4 py-2 whitespace-nowrap">{row.date}</td>
                            <td className="px-4 py-2">{row.description}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{row.amount > 0 ? money(row.amount) : ''}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{row.amount < 0 ? money(Math.abs(row.amount)) : ''}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{money(row.balance)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
