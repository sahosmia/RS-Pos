import BestSellersPurchasesWidget from '@/components/dashboard/best-sellers-purchases-widget';
import RevenueExpenseChart from '@/components/dashboard/revenue-expense-chart';
import SalesChart from '@/components/dashboard/sales-chart';
import HeadingSmall from '@/components/heading-small';
import DateRangeFilter from '@/components/shared/date-range-filter';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type BestSellersPeriodValue,
    type DashboardBalances,
    type DashboardBestSellerItem,
    type DashboardDailySalesPoint,
    type DashboardMetrics,
    type DashboardMonthlySalesPoint,
    type DashboardRange,
    type DashboardRecentTransactions,
    type DashboardRevenueExpensePoint,
    type DateRangePresetValue,
} from '@/types/models';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownLeft,
    ArrowUpRight,
    CreditCard,
    HandCoins,
    type LucideIcon,
    Package,
    Receipt,
    RotateCcw,
    ShoppingBag,
    TrendingUp,
    Wallet,
} from 'lucide-react';

interface DashboardProps {
    range: DashboardRange;
    metrics: DashboardMetrics;
    balances: DashboardBalances;
    salesLast30Days: DashboardDailySalesPoint[];
    salesCurrentFiscalYear: DashboardMonthlySalesPoint[];
    monthlyRevenueVsExpense: DashboardRevenueExpensePoint[];
    bestSellers: DashboardBestSellerItem[];
    recentTransactions: DashboardRecentTransactions;
    bestSellersPeriod: BestSellersPeriodValue;
}

/** `2026-09-26` → `26 Sep 2026` — full date format matching the design specs. */
function shortDayLabel(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${day} ${months[month - 1]} ${year}`;
}

function ColorfulMetricCard({ label, value, colorClass, icon: Icon }: { label: string; value: string; colorClass: string; icon: LucideIcon }) {
    return (
        <div className={`flex items-center justify-between gap-3 rounded-xl border p-4 shadow-xs transition-all hover:shadow-md ${colorClass}`}>
            <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wider uppercase opacity-80">{label}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums sm:text-2xl">{value}</p>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-current/10 p-2">
                <Icon className="size-5" />
            </div>
        </div>
    );
}

export default function Dashboard({
    range,
    metrics,
    balances,
    salesLast30Days,
    salesCurrentFiscalYear,
    monthlyRevenueVsExpense,
    bestSellers,
    recentTransactions,
    bestSellersPeriod,
}: DashboardProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('dashboard', 'title'), href: '/dashboard' }];

    // `DateRangeFilter`'s onChange is typed for the general (nullable) case, but this
    // page never passes `allowClear`, so `next.preset` is never actually null here.
    const changeRange = (next: { preset: DateRangePresetValue | null; from?: string | null; to?: string | null }) => {
        if (!next.preset) {
            return;
        }

        router.get(
            route('dashboard'),
            { preset: next.preset, from: next.from ?? undefined, to: next.to ?? undefined },
            { preserveState: true, preserveScroll: true, only: ['range', 'metrics'] },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('dashboard', 'title')} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall title={t('dashboard', 'title')} description={t('dashboard', 'description')} />
                    <DateRangeFilter range={range} onChange={changeRange} />
                </div>

                <div className="space-y-3">
                    <h2 className="text-foreground text-sm font-semibold tracking-wide">{t('dashboard', 'sales_section')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <ColorfulMetricCard
                            label={t('dashboard', 'total_sales')}
                            value={money(metrics.totalSales)}
                            icon={Receipt}
                            colorClass="bg-emerald-50/60 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-100"
                        />
                        <ColorfulMetricCard
                            label={t('dashboard', 'net_sales')}
                            value={money(metrics.netSales)}
                            icon={TrendingUp}
                            colorClass="bg-teal-50/60 border-teal-200 text-teal-950 dark:bg-teal-950/20 dark:border-teal-800 dark:text-teal-100"
                        />
                        <ColorfulMetricCard
                            label={t('dashboard', 'invoice_due')}
                            value={money(metrics.invoiceDue)}
                            icon={AlertCircle}
                            colorClass="bg-amber-50/60 border-amber-200 text-amber-950 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-100"
                        />
                        <ColorfulMetricCard
                            label={t('dashboard', 'total_sell_return')}
                            value={money(metrics.totalSellReturn)}
                            icon={RotateCcw}
                            colorClass="bg-rose-50/60 border-rose-200 text-rose-950 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-100"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-foreground text-sm font-semibold tracking-wide">{t('dashboard', 'purchases_expenses_section')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <ColorfulMetricCard
                            label={t('dashboard', 'total_purchase')}
                            value={money(metrics.totalPurchase)}
                            icon={ShoppingBag}
                            colorClass="bg-blue-50/60 border-blue-200 text-blue-950 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-100"
                        />
                        <ColorfulMetricCard
                            label={t('dashboard', 'purchase_due')}
                            value={money(metrics.purchaseDue)}
                            icon={CreditCard}
                            colorClass="bg-orange-50/60 border-orange-200 text-orange-950 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-100"
                        />
                        <ColorfulMetricCard
                            label={t('dashboard', 'total_purchase_return')}
                            value={money(metrics.totalPurchaseReturn)}
                            icon={RotateCcw}
                            colorClass="bg-pink-50/60 border-pink-200 text-pink-950 dark:bg-pink-950/20 dark:border-pink-800 dark:text-pink-100"
                        />
                        <ColorfulMetricCard
                            label={t('dashboard', 'expense')}
                            value={money(metrics.totalExpense)}
                            icon={HandCoins}
                            colorClass="bg-purple-50/60 border-purple-200 text-purple-950 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-100"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-foreground text-sm font-semibold tracking-wide">{t('dashboard', 'current_position')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <ColorfulMetricCard
                            label={t('dashboard', 'total_receivable')}
                            value={money(balances.totalReceivable)}
                            icon={ArrowDownLeft}
                            colorClass="bg-cyan-50/60 border-cyan-200 text-cyan-950 dark:bg-cyan-950/20 dark:border-cyan-800 dark:text-cyan-100"
                        />
                        <ColorfulMetricCard
                            label={t('dashboard', 'total_payable')}
                            value={money(balances.totalPayable)}
                            icon={ArrowUpRight}
                            colorClass="bg-red-50/60 border-red-200 text-red-950 dark:bg-red-950/20 dark:border-red-800 dark:text-red-100"
                        />
                        <ColorfulMetricCard
                            label={t('dashboard', 'cash_and_bank')}
                            value={money(balances.cashAndBank)}
                            icon={Wallet}
                            colorClass="bg-indigo-50/60 border-indigo-200 text-indigo-950 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-100"
                        />
                        <ColorfulMetricCard
                            label={t('dashboard', 'low_stock_products')}
                            value={String(balances.lowStockCount)}
                            icon={Package}
                            colorClass="bg-violet-50/60 border-violet-200 text-violet-950 dark:bg-violet-950/20 dark:border-violet-800 dark:text-violet-100"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-2">
                    <SalesChart
                        title="Sales Last 30 Days"
                        data={salesLast30Days.map((point) => ({ key: point.date, label: shortDayLabel(point.date), total: point.total }))}
                    />
                    <SalesChart
                        title="Sales — Current Fiscal Year"
                        data={salesCurrentFiscalYear.map((point) => ({ key: point.month, label: point.label, total: point.total }))}
                    />

                    <RevenueExpenseChart title="Revenue vs Expense — Monthly" data={monthlyRevenueVsExpense} />

                    <BestSellersPurchasesWidget bestSellers={bestSellers} purchases={recentTransactions.purchases} period={bestSellersPeriod} />
                </div>
            </div>
        </AppLayout>
    );
}
