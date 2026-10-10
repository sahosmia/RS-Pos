import HeadingSmall from '@/components/heading-small';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { pageContainer } from '@/lib/page-container';
import { type BreadcrumbItem } from '@/types';
import { type TrialBalanceRow } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Trial Balance', href: '/reports/trial-balance' }];

interface TrialBalanceProps {
    rows: TrialBalanceRow[];
    totalDebit: number;
    totalCredit: number;
}

export default function TrialBalance({ rows, totalDebit, totalCredit }: TrialBalanceProps) {
    const money = useMoneyFormat();
    const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Trial Balance" />

            <div className={pageContainer.medium}>
                <HeadingSmall title="Trial Balance" description="সব Chart of Accounts, Debit/Credit column-এ — সবসময় balanced" />

                <div className="overflow-x-auto rounded-brand-card bg-card shadow-[var(--brand-card-shadow-elevated)]">
                    <table className="w-full text-sm">
                        <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium">Account</th>
                                <th className="px-4 py-2.5 text-right font-medium">Debit</th>
                                <th className="px-4 py-2.5 text-right font-medium">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
                                    <td className="px-4 py-2">
                                        {row.code} — {row.name}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{row.debit !== 0 ? money(row.debit) : ''}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{row.credit !== 0 ? money(row.credit) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-brand-table-divider border-t font-medium">
                                <td className="px-4 py-2">Total</td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(totalDebit)}</td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {!balanced && (
                    <p className="text-destructive text-sm">
                        ⚠️ Total Debit ({money(totalDebit)}) does not equal Total Credit ({money(totalCredit)})
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
