import ChartShell from '@/components/dashboard/chart-shell';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { baseChartOptions, tooltipRow, useChartTheme, withAlpha } from '@/lib/chart-theme';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ShoppingCart } from 'lucide-react';
import { useMemo, useRef } from 'react';

export interface SalesChartPoint {
    /** Stable identity for the point (a date or "YYYY-MM"). */
    key: string;
    /** Formatted label e.g., "28 Aug 2026" or "Sep 2026". */
    label: string;
    total: number;
}

interface SalesChartProps {
    title: string;
    data: SalesChartPoint[];
    seriesName?: string;
}

/** "28 Aug 2026" → "28 Aug" on the axis (the tooltip keeps the full date); a month label is already short. */
function axisLabel(label: string): string {
    const parts = label.split(' ');

    return parts.length === 3 ? `${parts[0]} ${parts[1]}` : label;
}

/** Smooth area chart of sales over time, in the shop's theme colour. */
export default function SalesChart({ title, data, seriesName = 'Total Sales' }: SalesChartProps) {
    const money = useMoneyFormat();
    const theme = useChartTheme();
    const chartRef = useRef<HighchartsReact.RefObject>(null);

    const options = useMemo<Highcharts.Options>(() => {
        const base = baseChartOptions(theme);
        const categories = data.map((point) => point.label);

        return {
            ...base,
            chart: { ...base.chart, type: 'areaspline' },
            xAxis: {
                ...base.xAxis,
                categories: data.map((point) => axisLabel(point.label)),
                tickInterval: Math.max(1, Math.ceil(data.length / 8)),
                labels: { ...(base.xAxis as Highcharts.XAxisOptions).labels, rotation: 0 },
            },
            legend: { enabled: false },
            tooltip: {
                ...base.tooltip,
                formatter() {
                    const { x, y, key, series } = this;
                    const label = categories[x as number] ?? key;

                    return `<div style="padding:4px 6px;font-size:12px;line-height:1.5">
                        <div style="font-weight:600;color:${theme.text};margin-bottom:4px">${label}</div>
                        ${tooltipRow(theme.primary, series.name, money(Number(y)), theme.muted)}
                    </div>`;
                },
            },
            plotOptions: {
                areaspline: {
                    lineWidth: 2.5,
                    marker: {
                        enabled: false,
                        states: { hover: { enabled: true, radius: 5, lineWidth: 2, lineColor: theme.card, fillColor: theme.primary } },
                    },
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, withAlpha(theme.primary, 0.28)],
                            [1, withAlpha(theme.primary, 0)],
                        ],
                    },
                    threshold: null,
                },
            },
            series: [{ type: 'areaspline', name: seriesName, data: data.map((point) => point.total), color: theme.primary }],
        };
    }, [data, money, seriesName, theme]);

    return (
        <ChartShell title={title} subtitle="Confirmed sales, BDT" icon={ShoppingCart}>
            <HighchartsReact highcharts={Highcharts} options={options} ref={chartRef} />
        </ChartShell>
    );
}
