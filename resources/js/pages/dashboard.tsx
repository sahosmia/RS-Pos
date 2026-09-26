import SalesBarChart from '@/components/dashboard/sales-bar-chart';
import HeadingSmall from '@/components/heading-small';
import DateRangeFilter from '@/components/shared/date-range-filter';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type DashboardBalances,
    type DashboardDailySalesPoint,
    type DashboardMetrics,
    type DashboardMonthlySalesPoint,
    type DashboardRange,
    type DateRangePresetValue,
    type QuickAction,
} from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';

interface DashboardProps {
    quickActions: QuickAction[];
    range: DashboardRange;
    metrics: DashboardMetrics;
    balances: DashboardBalances;
    salesLast30Days: DashboardDailySalesPoint[];
    salesCurrentFiscalYear: DashboardMonthlySalesPoint[];
}

/** `2026-07-26` → `26 Jul` — short enough for 30 bars to sit under without colliding. */
function shortDayLabel(isoDate: string): string {
    const [, month, day] = isoDate.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${day} ${months[month - 1]}`;
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
    );
}

export default function Dashboard({ quickActions, range, metrics, balances, salesLast30Days, salesCurrentFiscalYear }: DashboardProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('dashboard', 'title'), href: '/dashboard' }];

    const changeRange = (next: { preset: DateRangePresetValue; from?: string; to?: string }) => {
        router.get(route('dashboard'), next, { preserveState: true, preserveScroll: true, only: ['range', 'metrics'] });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('dashboard', 'title')} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall title={t('dashboard', 'title')} description={t('dashboard', 'description')} />
                    <DateRangeFilter range={range} onChange={changeRange} />
                </div>

                <div className="flex flex-wrap gap-2">
                    {quickActions.map((action) => (
                        <Button key={action.label} variant="outline" asChild>
                            <Link href={action.href}>{action.label}</Link>
                        </Button>
                    ))}
                </div>

                <div className="space-y-3">
                    <h2 className="text-sm font-medium">{t('dashboard', 'sales_section')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label={t('dashboard', 'total_sales')} value={money(metrics.totalSales)} />
                        <MetricCard label={t('dashboard', 'net_sales')} value={money(metrics.netSales)} />
                        <MetricCard label={t('dashboard', 'invoice_due')} value={money(metrics.invoiceDue)} />
                        <MetricCard label={t('dashboard', 'total_sell_return')} value={money(metrics.totalSellReturn)} />
                    </div>
                </div>

                <div className="grid gap-4 grid-cols-1">
                    <SalesBarChart
                        title="Sales — Last 30 Days"
                        data={salesLast30Days.map((point) => ({ key: point.date, label: shortDayLabel(point.date), total: point.total }))}
                        labelEvery={5}
                    />
                    <SalesBarChart
                        title="Sales — Current Fiscal Year"
                        description="By month"
                        data={salesCurrentFiscalYear.map((point) => ({ key: point.month, label: point.label, total: point.total }))}
                        labelEvery={2}
                    />
                </div>

                <div className="space-y-3">
                    <h2 className="text-sm font-medium">{t('dashboard', 'purchases_expenses_section')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label={t('dashboard', 'total_purchase')} value={money(metrics.totalPurchase)} />
                        <MetricCard label={t('dashboard', 'purchase_due')} value={money(metrics.purchaseDue)} />
                        <MetricCard label={t('dashboard', 'total_purchase_return')} value={money(metrics.totalPurchaseReturn)} />
                        <MetricCard label={t('dashboard', 'expense')} value={money(metrics.totalExpense)} />
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-sm font-medium">{t('dashboard', 'current_position')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label={t('dashboard', 'total_receivable')} value={money(balances.totalReceivable)} />
                        <MetricCard label={t('dashboard', 'total_payable')} value={money(balances.totalPayable)} />
                        <MetricCard label={t('dashboard', 'cash_and_bank')} value={money(balances.cashAndBank)} />
                        <MetricCard label={t('dashboard', 'low_stock_products')} value={String(balances.lowStockCount)} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
