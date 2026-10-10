import DataTablePagination from '@/components/data-table/data-table-pagination';
import { type DataTablePaginationMeta } from '@/components/data-table/types';
import { FormInput } from '@/components/form/form-input';
import { MetricCard } from '@/components/shared/metric-card';
import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type ChartOfAccountTypeValue, type GeneralLedgerLine, type NormalBalanceValue } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

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
    /** Balance carried into the first row of this page (everything before it). */
    openingBalance: number;
    pagination: DataTablePaginationMeta;
    filters: { from: string; to: string };
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function GeneralLedger({ account, lines, openingBalance, pagination, filters }: GeneralLedgerProps) {
    const money = useMoneyFormat();
    const [range, setRange] = useState(filters);
    const hasRange = filters.from !== '' || filters.to !== '';

    const visit = (params: Record<string, string | number>) =>
        router.get(route('chart-of-accounts.ledger', account.id), params, { preserveState: true, preserveScroll: true });

    const changeRange = (next: { from: string; to: string }) => {
        setRange(next);
        // dates are applied together once both are valid, or when cleared
        if ((next.from && next.to) || (!next.from && !next.to)) visit({ from: next.from, to: next.to });
    };

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

                <MetricCard label="Current Balance" value={money(account.balance)} accent="info" className="sm:max-w-xs" />

                <div className="flex flex-wrap items-end gap-3">
                    <FormInput id="from" label="From" type="date" value={range.from} onChange={(e) => changeRange({ ...range, from: e.target.value })} />
                    <FormInput id="to" label="To" type="date" value={range.to} onChange={(e) => changeRange({ ...range, to: e.target.value })} />
                    {hasRange && (
                        <button type="button" className="text-primary pb-2 text-sm hover:underline" onClick={() => changeRange({ from: '', to: '' })}>
                            Clear dates
                        </button>
                    )}
                </div>

                {lines.length === 0 ? (
                    <EmptyState title="No journal lines" description={hasRange ? 'এই তারিখের সীমায় কোনো entry নেই' : 'এই account-এ এখনো কোনো entry পোস্ট হয়নি'} />
                ) : (
                    <div className="overflow-x-auto rounded-brand-card bg-card shadow-[var(--brand-card-shadow-elevated)]">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                                <tr>
                                    <th className="px-4 py-2.5 text-left font-medium">Date</th>
                                    <th className="px-4 py-2.5 text-left font-medium">Description</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Debit</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Credit</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagination.current_page > 1 && (
                                    <tr className="border-brand-table-divider text-muted-foreground border-t">
                                        <td className="px-4 py-2" colSpan={4}>
                                            Balance brought forward from previous page
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">{money(openingBalance)}</td>
                                    </tr>
                                )}
                                {lines.map((line) => (
                                    <tr key={line.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
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

                {pagination.total > 0 && (
                    <DataTablePagination
                        pagination={pagination}
                        perPage={100}
                        perPageOptions={[]}
                        allowAll={false}
                        onPerPageChange={() => undefined}
                        onPageChange={(page) => visit({ from: filters.from, to: filters.to, page })}
                        itemLabel="lines"
                    />
                )}
            </div>
        </AppLayout>
    );
}
