import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import { MetricCard } from '@/components/shared/metric-card';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { pageContainer } from '@/lib/page-container';
import { type BreadcrumbItem } from '@/types';
import { type ChartOfAccountLine } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Profit & Loss', href: '/reports/profit-loss' }];

interface ProfitLossProps {
    from: string;
    to: string;
    income: ChartOfAccountLine[];
    expense: ChartOfAccountLine[];
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
}

export default function ProfitLoss({ from, to, income, expense, totalIncome, totalExpense, netProfit }: ProfitLossProps) {
    const money = useMoneyFormat();
    const [range, setRange] = useState({ from, to });

    const handleFromChange = (fromVal: string) => {
        const next = { ...range, from: fromVal };
        setRange(next);
        if (fromVal && next.to) {
            router.get(route('reports.profit-loss'), next, { preserveState: true });
        }
    };

    const handleToChange = (toVal: string) => {
        const next = { ...range, to: toVal };
        setRange(next);
        if (next.from && toVal) {
            router.get(route('reports.profit-loss'), next, { preserveState: true });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profit & Loss" />

            <div className={pageContainer.medium}>
                <HeadingSmall title="Profit & Loss" description="Accrual ভিত্তিতে — Journal থেকে সোর্স করা" />

                <div className="flex flex-wrap items-end gap-2">
                    <FormInput id="from" label="From" type="date" value={range.from} onChange={(e) => handleFromChange(e.target.value)} />
                    <FormInput id="to" label="To" type="date" value={range.to} onChange={(e) => handleToChange(e.target.value)} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard label="Total Income" value={money(totalIncome)} />
                    <MetricCard label="Total Expense" value={money(totalExpense)} />
                    <MetricCard label="Net Profit" value={money(netProfit)} accent={netProfit < 0 ? 'danger' : 'neutral'} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-brand-card bg-card overflow-x-auto shadow-[var(--brand-card-shadow-elevated)]">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                                <tr>
                                    <th className="px-4 py-2.5 text-left font-medium">Income Account</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {income.map((line) => (
                                    <tr key={line.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
                                        <td className="px-4 py-2">
                                            {line.code} — {line.name}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">{money(line.amount)}</td>
                                    </tr>
                                ))}
                                {income.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="text-muted-foreground px-4 py-8 text-center">
                                            কোনো income নেই
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-brand-card bg-card overflow-x-auto shadow-[var(--brand-card-shadow-elevated)]">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                                <tr>
                                    <th className="px-4 py-2.5 text-left font-medium">Expense Account</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expense.map((line) => (
                                    <tr key={line.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
                                        <td className="px-4 py-2">
                                            {line.code} — {line.name}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">{money(line.amount)}</td>
                                    </tr>
                                ))}
                                {expense.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="text-muted-foreground px-4 py-8 text-center">
                                            কোনো expense নেই
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
