import ChartShell from '@/components/dashboard/chart-shell';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { baseChartOptions, tooltipRow, useChartTheme } from '@/lib/chart-theme';
import { type DashboardRevenueExpensePoint } from '@/types/models';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { BarChart3 } from 'lucide-react';
import { useMemo, useRef } from 'react';

interface RevenueExpenseChartProps {
    title: string;
    data: DashboardRevenueExpensePoint[];
}

/** Grouped monthly column chart — Revenue vs Expense, side by side per month. */
export default function RevenueExpenseChart({ title, data }: RevenueExpenseChartProps) {
    const money = useMoneyFormat();
    const theme = useChartTheme();
    const chartRef = useRef<HighchartsReact.RefObject>(null);

    const options = useMemo<Highcharts.Options>(() => {
        const base = baseChartOptions(theme);

        return {
            ...base,
            chart: { ...base.chart, type: 'column' },
            xAxis: {
                ...base.xAxis,
                categories: data.map((point) => point.label),
                labels: { ...(base.xAxis as Highcharts.XAxisOptions).labels, rotation: 0 },
            },
            tooltip: {
                ...base.tooltip,
                shared: true,
                formatter() {
                    const points = this.points ?? [];
                    const rows = points
                        .map((point) => tooltipRow(String(point.color), point.series.name, money(Number(point.y)), theme.muted))
                        .join('');

                    return `<div style="padding:4px 6px;font-size:12px;line-height:1.5">
                        <div style="font-weight:600;color:${theme.text};margin-bottom:4px">${points[0]?.key ?? ''}</div>
                        ${rows}
                    </div>`;
                },
            },
            plotOptions: {
                column: { borderRadius: 4, borderWidth: 0, groupPadding: 0.14, pointPadding: 0.04, maxPointWidth: 28 },
            },
            series: [
                { type: 'column', name: 'Revenue', data: data.map((point) => point.revenue), color: theme.success },
                { type: 'column', name: 'Expense', data: data.map((point) => point.expense), color: theme.danger },
            ],
        };
    }, [data, money, theme]);

    return (
        <ChartShell title={title} subtitle="Money in vs money out, BDT" icon={BarChart3} iconClassName="bg-brand-success/10 text-brand-success-text">
            <HighchartsReact highcharts={Highcharts} options={options} ref={chartRef} />
        </ChartShell>
    );
}
