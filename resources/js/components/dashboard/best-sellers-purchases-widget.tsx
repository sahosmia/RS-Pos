import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type BestSellersPeriodValue, type DashboardBestSellerItem, type DashboardRecentTransactionRow } from '@/types/models';
import { Link, router } from '@inertiajs/react';
import { Award, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';

const PERIODS: { value: BestSellersPeriodValue; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last_7_days', label: '7 Days' },
    { value: 'last_30_days', label: '30 Days' },
];

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

interface BestSellersPurchasesWidgetProps {
    bestSellers: DashboardBestSellerItem[];
    purchases: DashboardRecentTransactionRow[];
    /** The period the server actually resolved `bestSellers`/`purchases` for — kept in sync with the tab. */
    period: BestSellersPeriodValue;
}

/**
 * Best Sellers + recent Purchases, both scoped to the same Today/Yesterday/
 * 7 days/30 days tab. Switching the tab only refetches this widget's own
 * props (`bestSellers`, `recentTransactions`) via a partial Inertia reload —
 * it never touches the rest of the dashboard.
 */
export default function BestSellersPurchasesWidget({ bestSellers, purchases, period }: BestSellersPurchasesWidgetProps) {
    const money = useMoneyFormat();
    const [activePeriod, setActivePeriod] = useState<BestSellersPeriodValue>(period);
    const [loading, setLoading] = useState(false);

    // Re-sync if the server's resolved period ever changes from elsewhere
    // (e.g. browser back/forward restoring an older Inertia page state).
    useEffect(() => {
        setActivePeriod(period);
    }, [period]);

    const changePeriod = (value: string) => {
        const next = value as BestSellersPeriodValue;
        setActivePeriod(next);
        router.reload({
            only: ['bestSellers', 'recentTransactions', 'bestSellersPeriod'],
            data: { period: next },
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    return (
        <div className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                        <Award className="size-5" />
                    </div>
                    <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">Best Sellers & Purchases</h3>
                </div>

                <Tabs value={activePeriod} onValueChange={changePeriod}>
                    <TabsList>
                        {PERIODS.map((option) => (
                            <TabsTrigger key={option.value} value={option.value} disabled={loading}>
                                {option.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            <div className={`grid gap-6 transition-opacity lg:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
                <div>
                    <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                        <Award className="size-4" />
                        Best Sellers
                    </h4>
                    {bestSellers.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No sales in this period.</p>
                    ) : (
                        <ul className="divide-y">
                            {bestSellers.map((item) => (
                                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-800 dark:text-slate-100">{item.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="font-semibold tabular-nums">{item.quantity} sold</p>
                                        <p className="text-xs tabular-nums text-muted-foreground">{money(item.total_amount)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                        <ShoppingBag className="size-4" />
                        Purchases
                    </h4>
                    {purchases.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No purchases in this period.</p>
                    ) : (
                        <ul className="divide-y">
                            {purchases.map((purchase) => (
                                <li key={purchase.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                    <div className="min-w-0">
                                        <Link
                                            href={purchase.href}
                                            className="block truncate font-medium text-slate-800 hover:underline dark:text-slate-100"
                                        >
                                            {purchase.invoice_no}
                                        </Link>
                                        <p className="truncate text-xs text-muted-foreground">{purchase.party_name}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="font-semibold tabular-nums">{money(purchase.amount)}</p>
                                        <Badge variant="outline" className="text-[10px]">
                                            {humanize(purchase.status)}
                                        </Badge>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
