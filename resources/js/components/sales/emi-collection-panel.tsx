import { MetricCard, MetricGrid } from '@/components/shared/metric-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { cn } from '@/lib/utils';
import { AlertTriangle, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, HandCoins } from 'lucide-react';

export type CollectionGroup = 'week' | 'month' | 'year';

export interface CollectionRow {
    key: string;
    label: string;
    from: string;
    to: string;
    expected: number;
    collected: number;
    remaining: number;
    overdue: number;
    is_current: boolean;
}

export interface EmiCollection {
    group: CollectionGroup;
    year: number;
    rows: CollectionRow[];
    totals: { expected: number; collected: number; remaining: number; overdue: number };
}

export interface EmiHeadline {
    overdue: number;
    due_this_week: number;
    due_this_month: number;
    collected_this_month: number;
}

interface EmiCollectionPanelProps {
    headline: EmiHeadline;
    collection: EmiCollection;
    onChange: (next: { group?: CollectionGroup; year?: number }) => void;
}

const GROUP_LABEL: Record<CollectionGroup, string> = { week: 'Weekly', month: 'Monthly', year: 'Yearly' };

const PERIOD_HINT: Record<CollectionGroup, string> = {
    week: 'The last 4 weeks, this week and the next 7',
    month: 'January to December',
    year: 'Two years back to three years ahead',
};

/**
 * How much EMI money is coming in: headline numbers, then a weekly / monthly / yearly breakdown of what is
 * expected (installments falling due), collected (cash actually received) and still owed.
 */
export function EmiCollectionPanel({ headline, collection, onChange }: EmiCollectionPanelProps) {
    const money = useMoneyFormat();

    return (
        <section aria-label="EMI collection summary" className="space-y-4">
            <MetricGrid columns={4}>
                <MetricCard
                    label="Overdue"
                    value={money(headline.overdue)}
                    icon={AlertTriangle}
                    accent={headline.overdue > 0 ? 'danger' : 'neutral'}
                    caption="Unpaid and past its due date"
                />
                <MetricCard
                    label="Due this week"
                    value={money(headline.due_this_week)}
                    icon={CalendarClock}
                    accent="warning"
                    caption="Still to collect, Mon – Sun"
                />
                <MetricCard
                    label="Due this month"
                    value={money(headline.due_this_month)}
                    icon={CalendarDays}
                    accent="info"
                    caption="Still to collect this month"
                />
                <MetricCard
                    label="Collected this month"
                    value={money(headline.collected_this_month)}
                    icon={HandCoins}
                    accent="success"
                    caption="Cash received so far"
                />
            </MetricGrid>

            <Card>
                <CardHeader divided>
                    <CardTitle>Collection breakdown</CardTitle>
                    <CardDescription>{PERIOD_HINT[collection.group]}</CardDescription>
                    <CardAction className="gap-2">
                        {collection.group === 'month' && (
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Previous year"
                                    onClick={() => onChange({ year: collection.year - 1 })}
                                >
                                    <ChevronLeft />
                                </Button>
                                <span className="min-w-12 text-center text-sm font-medium tabular-nums">{collection.year}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Next year"
                                    onClick={() => onChange({ year: collection.year + 1 })}
                                >
                                    <ChevronRight />
                                </Button>
                            </div>
                        )}
                        <Tabs value={collection.group} onValueChange={(value) => onChange({ group: value as CollectionGroup })}>
                            <TabsList aria-label="Group by">
                                {(Object.keys(GROUP_LABEL) as CollectionGroup[]).map((group) => (
                                    <TabsTrigger key={group} value={group}>
                                        {GROUP_LABEL[group]}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </CardAction>
                </CardHeader>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-sm">
                        <thead>
                            <tr className="bg-brand-table-header text-muted-foreground text-xs font-semibold tracking-wide">
                                <th scope="col" className="border-brand-table-divider border-b px-4 py-2.5 text-left">
                                    Period
                                </th>
                                <th scope="col" className="border-brand-table-divider border-b px-4 py-2.5 text-right">
                                    Expected
                                </th>
                                <th scope="col" className="border-brand-table-divider border-b px-4 py-2.5 text-right">
                                    Collected
                                </th>
                                <th scope="col" className="border-brand-table-divider border-b px-4 py-2.5 text-right">
                                    Still owed
                                </th>
                                <th scope="col" className="border-brand-table-divider border-b px-4 py-2.5 text-right">
                                    Overdue
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {collection.rows.map((row) => (
                                <tr
                                    key={row.key}
                                    className={cn('motion-colors hover:bg-brand-table-row-hover', row.is_current && 'bg-brand-primary/[0.04]')}
                                >
                                    <td className="border-brand-table-divider border-b px-4 py-2.5 font-medium whitespace-nowrap">
                                        {row.label}
                                        {row.is_current && (
                                            <Badge variant="primary" size="xs" className="ml-2 align-middle">
                                                Now
                                            </Badge>
                                        )}
                                    </td>
                                    <td
                                        className={cn(
                                            'border-brand-table-divider border-b px-4 py-2.5 text-right tabular-nums',
                                            row.expected === 0 && 'text-muted-foreground',
                                        )}
                                    >
                                        {money(row.expected)}
                                    </td>
                                    <td
                                        className={cn(
                                            'border-brand-table-divider border-b px-4 py-2.5 text-right tabular-nums',
                                            row.collected > 0 ? 'text-brand-success-text font-medium' : 'text-muted-foreground',
                                        )}
                                    >
                                        {money(row.collected)}
                                    </td>
                                    <td
                                        className={cn(
                                            'border-brand-table-divider border-b px-4 py-2.5 text-right tabular-nums',
                                            row.remaining === 0 && 'text-muted-foreground',
                                        )}
                                    >
                                        {money(row.remaining)}
                                    </td>
                                    <td
                                        className={cn(
                                            'border-brand-table-divider border-b px-4 py-2.5 text-right tabular-nums',
                                            row.overdue > 0 ? 'text-brand-danger-text font-medium' : 'text-muted-foreground',
                                        )}
                                    >
                                        {money(row.overdue)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-brand-table-header font-semibold">
                                <th scope="row" className="px-4 py-2.5 text-left">
                                    Total
                                </th>
                                <td className="px-4 py-2.5 text-right tabular-nums">{money(collection.totals.expected)}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{money(collection.totals.collected)}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{money(collection.totals.remaining)}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{money(collection.totals.overdue)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <p className="text-muted-foreground border-brand-card-border border-t px-4 py-3 text-xs leading-5">
                    <strong className="text-foreground font-medium">Expected</strong> is the installments falling due in that period.{' '}
                    <strong className="text-foreground font-medium">Collected</strong> is the cash actually received in that period, whichever
                    installment it paid.
                </p>
            </Card>
        </section>
    );
}
