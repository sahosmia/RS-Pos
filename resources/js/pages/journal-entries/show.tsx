import HeadingSmall from '@/components/heading-small';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type JournalEntryDetail } from '@/types/models';
import { Head, Link } from '@inertiajs/react';

interface JournalEntryShowProps {
    entry: JournalEntryDetail;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Journal Entries', href: '/journal-entries' }];

export default function JournalEntryShow({ entry }: JournalEntryShowProps) {
    const money = useMoneyFormat();
    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Journal Entry #${entry.id}`} />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall
                    title={entry.description}
                    description={`${entry.entry_date}${entry.reference_type ? ` • ${entry.reference_type} #${entry.reference_id}` : ''}`}
                />

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Account</th>
                                <th className="px-4 py-2 text-left font-medium">Note</th>
                                <th className="px-4 py-2 text-right font-medium">Debit</th>
                                <th className="px-4 py-2 text-right font-medium">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entry.lines.map((line) => (
                                <tr key={line.id} className="border-t">
                                    <td className="px-4 py-2">
                                        <Link
                                            href={route('chart-of-accounts.ledger', line.chart_of_account.id)}
                                            className="underline-offset-2 hover:underline"
                                        >
                                            {line.chart_of_account.code} — {line.chart_of_account.name}
                                        </Link>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-2">{line.note ?? '—'}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{line.debit > 0 ? money(line.debit) : ''}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{line.credit > 0 ? money(line.credit) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t font-medium">
                                <td colSpan={2} className="px-4 py-2 text-right">
                                    Total
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(totalDebit)}</td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
