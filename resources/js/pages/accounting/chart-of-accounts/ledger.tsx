import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type ChartOfAccountTypeValue, type GeneralLedgerLine, type NormalBalanceValue } from '@/types/models';
import { Head, Link } from '@inertiajs/react';

interface GeneralLedgerProps {
    account: {
        id: number;
        code: string;
        name: string;
        type: ChartOfAccountTypeValue;
        normal_balance: NormalBalanceValue;
        balance: number;
    };
    lines: GeneralLedgerLine[];
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function GeneralLedger({ account, lines }: GeneralLedgerProps) {
    const money = useMoneyFormat();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Chart of Accounts', href: '/chart-of-accounts' },
        { title: `${account.code} — ${account.name}`, href: `/chart-of-accounts/${account.id}/ledger` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ledger — ${account.name}`} />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall
                    title={`${account.code} — ${account.name}`}
                    description={`${humanize(account.type)} · Normal balance: ${humanize(account.normal_balance)}`}
                />

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Current Balance</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(account.balance)}</p>
                </div>

                {lines.length === 0 ? (
                    <EmptyState title="No journal lines yet" description="এই account-এ এখনো কোনো entry পোস্ট হয়নি" />
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Date</th>
                                    <th className="px-4 py-2 text-left font-medium">Description</th>
                                    <th className="px-4 py-2 text-right font-medium">Debit</th>
                                    <th className="px-4 py-2 text-right font-medium">Credit</th>
                                    <th className="px-4 py-2 text-right font-medium">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line) => (
                                    <tr key={line.id} className="border-t">
                                        <td className="px-4 py-2 whitespace-nowrap">{line.entry_date}</td>
                                        <td className="px-4 py-2">
                                            <Link
                                                href={route('journal-entries.show', line.journal_entry_id)}
                                                className="underline-offset-2 hover:underline"
                                            >
                                                {line.description}
                                            </Link>
                                            {line.note && <div className="text-muted-foreground text-xs">{line.note}</div>}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">{line.debit > 0 ? money(line.debit) : ''}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{line.credit > 0 ? money(line.credit) : ''}</td>
                                        <td className="px-4 py-2 text-right font-medium tabular-nums">{money(line.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
