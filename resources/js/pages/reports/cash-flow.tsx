import HeadingSmall from '@/components/heading-small';
import DateRangeFilter from '@/components/shared/date-range-filter';
import { MetricCard } from '@/components/shared/metric-card';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { pageContainer } from '@/lib/page-container';
import { type BreadcrumbItem } from '@/types';
import { type CashFlowTypeRow, type DateRangePresetValue } from '@/types/models';
import { Head, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Cash Flow', href: '/reports/cash-flow' }];

interface CashFlowProps {
    from: string;
    to: string;
    range?: {
        preset: DateRangePresetValue | null;
        from: string | null;
        to: string | null;
    };
    byType: CashFlowTypeRow[];
    moneyIn: number;
    moneyOut: number;
    net: number;
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function CashFlow({ from, to, range, byType, moneyIn, moneyOut, net }: CashFlowProps) {
    const money = useMoneyFormat();

    const activeRange = range ?? { preset: 'custom' as const, from, to };

    const changeRange = (next: { preset?: DateRangePresetValue | null; from?: string | null; to?: string | null }) => {
        router.get(
            route('reports.cash-flow'),
            {
                preset: next.preset ?? undefined,
                from: next.from ?? undefined,
                to: next.to ?? undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cash Flow" />

            <div className={pageContainer.medium}>
                <HeadingSmall title="Cash Flow" description="টাইপ অনুযায়ী টাকার আসা-যাওয়া" />

                <div className="flex flex-wrap items-end gap-2">
                    <DateRangeFilter range={activeRange} onChange={changeRange} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard label="Money In" value={money(moneyIn)} />
                    <MetricCard label="Money Out" value={money(Math.abs(moneyOut))} />
                    <MetricCard label="Net" value={money(net)} accent={net < 0 ? 'danger' : 'neutral'} />
                </div>

                <div className="rounded-brand-card bg-card overflow-x-auto shadow-[var(--brand-card-shadow-elevated)]">
                    <table className="w-full text-sm">
                        <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byType.map((row) => (
                                <tr key={row.type} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
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
