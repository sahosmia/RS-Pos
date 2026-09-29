import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CashFlowTypeRow } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Cash Flow', href: '/reports/cash-flow' }];

interface CashFlowProps {
    from: string;
    to: string;
    byType: CashFlowTypeRow[];
    moneyIn: number;
    moneyOut: number;
    net: number;
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function CashFlow({ from, to, byType, moneyIn, moneyOut, net }: CashFlowProps) {
    const money = useMoneyFormat();
    const [range, setRange] = useState({ from, to });

    const handleFromChange = (fromVal: string) => {
        const next = { ...range, from: fromVal };
        setRange(next);
        if (fromVal && next.to) {
            router.get(route('reports.cash-flow'), next, { preserveState: true });
        }
    };

    const handleToChange = (toVal: string) => {
        const next = { ...range, to: toVal };
        setRange(next);
        if (next.from && toVal) {
            router.get(route('reports.cash-flow'), next, { preserveState: true });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cash Flow" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Cash Flow" description="টাইপ অনুযায়ী টাকার আসা-যাওয়া" />

                <div className="flex flex-wrap items-end gap-2">
                    <FormInput id="from" label="From" type="date" value={range.from} onChange={(e) => handleFromChange(e.target.value)} />
                    <FormInput id="to" label="To" type="date" value={range.to} onChange={(e) => handleToChange(e.target.value)} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Money In</p>
                        <p className="text-xl font-semibold tabular-nums">{money(moneyIn)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Money Out</p>
                        <p className="text-xl font-semibold tabular-nums">{money(Math.abs(moneyOut))}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Net</p>
                        <p className={`text-xl font-semibold tabular-nums ${net < 0 ? 'text-destructive' : ''}`}>{money(net)}</p>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Type</th>
                                <th className="px-4 py-2 text-right font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byType.map((row) => (
                                <tr key={row.type} className="border-t">
                                    <td className="px-4 py-2">{humanize(row.type)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(row.total)}</td>
                                </tr>
                            ))}
                            {byType.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="text-muted-foreground px-4 py-8 text-center">
                                        এই সময়ে কোনো transaction নেই
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
