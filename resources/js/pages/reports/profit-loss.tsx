import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type ChartOfAccountLine } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(route('reports.profit-loss'), range, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profit & Loss" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Profit & Loss" description="Accrual ভিত্তিতে — Journal থেকে সোর্স করা" />

                <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
                    <FormInput id="from" label="From" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                    <FormInput id="to" label="To" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
                    <Button type="submit" variant="outline">
                        Apply
                    </Button>
                </form>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Total Income</p>
                        <p className="text-xl font-semibold tabular-nums">{money(totalIncome)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Total Expense</p>
                        <p className="text-xl font-semibold tabular-nums">{money(totalExpense)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Net Profit</p>
                        <p className={`text-xl font-semibold tabular-nums ${netProfit < 0 ? 'text-destructive' : ''}`}>{money(netProfit)}</p>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Income Account</th>
                                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {income.map((line) => (
                                    <tr key={line.id} className="border-t">
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

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Expense Account</th>
                                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expense.map((line) => (
                                    <tr key={line.id} className="border-t">
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
