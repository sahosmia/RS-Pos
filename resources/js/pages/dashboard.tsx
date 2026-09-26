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

function MetricItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
        </div>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border p-4">
            <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">{title}</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
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

                <SectionCard title={t('dashboard', 'sales_section')}>
                    <MetricItem label={t('dashboard', 'total_sales')} value={money(metrics.totalSales)} />
                    <MetricItem label={t('dashboard', 'net_sales')} value={money(metrics.netSales)} />
                    <MetricItem label={t('dashboard', 'invoice_due')} value={money(metrics.invoiceDue)} />
                    <MetricItem label={t('dashboard', 'total_sell_return')} value={money(metrics.totalSellReturn)} />
                </SectionCard>

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

                <SectionCard title={t('dashboard', 'purchases_expenses_section')}>
                    <MetricItem label={t('dashboard', 'total_purchase')} value={money(metrics.totalPurchase)} />
                    <MetricItem label={t('dashboard', 'purchase_due')} value={money(metrics.purchaseDue)} />
                    <MetricItem label={t('dashboard', 'total_purchase_return')} value={money(metrics.totalPurchaseReturn)} />
                    <MetricItem label={t('dashboard', 'expense')} value={money(metrics.totalExpense)} />
                </SectionCard>

                <SectionCard title={t('dashboard', 'current_position')}>
                    <MetricItem label={t('dashboard', 'total_receivable')} value={money(balances.totalReceivable)} />
                    <MetricItem label={t('dashboard', 'total_payable')} value={money(balances.totalPayable)} />
                    <MetricItem label={t('dashboard', 'cash_and_bank')} value={money(balances.cashAndBank)} />
                    <MetricItem label={t('dashboard', 'low_stock_products')} value={String(balances.lowStockCount)} />
                </SectionCard>
            </div>
        </AppLayout>
    );
}
