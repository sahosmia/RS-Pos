import BestSellersPurchasesWidget from '@/components/dashboard/best-sellers-purchases-widget';
import { LowStockWidget } from '@/components/dashboard/low-stock-widget';
import RevenueExpenseChart from '@/components/dashboard/revenue-expense-chart';
import SalesChart from '@/components/dashboard/sales-chart';
import HeadingSmall from '@/components/heading-small';
import DateRangeFilter from '@/components/shared/date-range-filter';
import { MetricCard, MetricGrid } from '@/components/shared/metric-card';
import { PageSection } from '@/components/shared/page-section';
import { PanelCard } from '@/components/shared/panel-card';
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
    type DashboardLowStockProduct,
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
    lowStockProducts: DashboardLowStockProduct[];
    salesLast30Days: DashboardDailySalesPoint[];
    salesCurrentFiscalYear: DashboardMonthlySalesPoint[];
    monthlyRevenueVsExpense: DashboardRevenueExpensePoint[];
    bestSellers: DashboardBestSellerItem[];
    recentTransactions: DashboardRecentTransactions;
    bestSellersPeriod: BestSellersPeriodValue;
}

/**
 * `2026-09-26` → `26 Sep 2026`
 */
function shortDayLabel(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);

    const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ];

    return `${day} ${months[month - 1]} ${year}`;
}

export default function Dashboard({
    range,
    metrics,
    balances,
    lowStockProducts,
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

            <div className="min-h-full bg-background">
                <div className="space-y-7 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="min-w-0">
                            <HeadingSmall title={t('dashboard', 'title')} description={t('dashboard', 'description')} />
                        </div>

                        <div className="shrink-0">
                            <DateRangeFilter range={range} onChange={changeRange} />
                        </div>
                    </div>

                    <PageSection title={t('dashboard', 'sales_section')}>
                        <MetricGrid>
                            <MetricCard label={t('dashboard', 'total_sales')} value={money(metrics.totalSales)} icon={Receipt} accent="success" />
                            <MetricCard label={t('dashboard', 'net_sales')} value={money(metrics.netSales)} icon={TrendingUp} accent="info" />
                            <MetricCard label={t('dashboard', 'invoice_due')} value={money(metrics.invoiceDue)} icon={AlertCircle} accent="warning" />
                            <MetricCard
                                label={t('dashboard', 'total_sell_return')}
                                value={money(metrics.totalSellReturn)}
                                icon={RotateCcw}
                                accent="danger"
                            />
                        </MetricGrid>
                    </PageSection>

                    <PageSection title={t('dashboard', 'purchases_expenses_section')}>
                        <MetricGrid>
                            <MetricCard label={t('dashboard', 'total_purchase')} value={money(metrics.totalPurchase)} icon={ShoppingBag} accent="info" />
                            <MetricCard label={t('dashboard', 'purchase_due')} value={money(metrics.purchaseDue)} icon={CreditCard} accent="warning" />
                            <MetricCard
                                label={t('dashboard', 'total_purchase_return')}
                                value={money(metrics.totalPurchaseReturn)}
                                icon={RotateCcw}
                                accent="danger"
                            />
                            <MetricCard label={t('dashboard', 'expense')} value={money(metrics.totalExpense)} icon={HandCoins} accent="financial" />
                        </MetricGrid>
                    </PageSection>

                    <PageSection title={t('dashboard', 'current_position')}>
                        <MetricGrid>
                            <MetricCard
                                label={t('dashboard', 'total_receivable')}
                                value={money(balances.totalReceivable)}
                                icon={ArrowDownLeft}
                                accent="info"
                            />
                            <MetricCard
                                label={t('dashboard', 'total_payable')}
                                value={money(balances.totalPayable)}
                                icon={ArrowUpRight}
                                accent="warning"
                            />
                            <MetricCard label={t('dashboard', 'cash_and_bank')} value={money(balances.cashAndBank)} icon={Wallet} accent="success" />
                            <MetricCard
                                label={t('dashboard', 'closing_stock_value')}
                                value={money(balances.closingStockValue)}
                                icon={Package}
                                accent="financial"
                            />
                        </MetricGrid>
                    </PageSection>

                    <section className="space-y-6 pt-1">
                        <PanelCard>
                            <SalesChart
                                title="Sales Last 30 Days"
                                data={salesLast30Days.map((point) => ({ key: point.date, label: shortDayLabel(point.date), total: point.total }))}
                            />
                        </PanelCard>

                        <PanelCard>
                            <SalesChart
                                title="Sales — Current Fiscal Year"
                                data={salesCurrentFiscalYear.map((point) => ({ key: point.month, label: point.label, total: point.total }))}
                            />
                        </PanelCard>

                        {/* The chart sets the row height; the low-stock list scrolls inside its own cell. */}
                        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-4">
                            <div className="min-w-0 lg:col-span-3">
                                <PanelCard className="h-full">
                                    <RevenueExpenseChart title="Revenue vs Expense — Monthly" data={monthlyRevenueVsExpense} />
                                </PanelCard>
                            </div>

                            <div className="relative min-w-0 lg:col-span-1">
                                <PanelCard className="h-full">
                                    <LowStockWidget products={lowStockProducts} />
                                </PanelCard>
                            </div>
                        </div>

                        <PanelCard>
                            <BestSellersPurchasesWidget
                                bestSellers={bestSellers}
                                purchases={recentTransactions.purchases}
                                period={bestSellersPeriod}
                            />
                        </PanelCard>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
