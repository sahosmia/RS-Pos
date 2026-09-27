import { useMoneyFormat } from '@/hooks/use-money-format';
import { type DashboardRevenueExpensePoint } from '@/types/models';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import { jsPDF } from 'jspdf';
import { BarChart3 } from 'lucide-react';
import { useRef } from 'react';
import 'svg2pdf.js';

// Same offline-export registration as `sales-chart.tsx` — see that file's
// comment for why this can't rely on Highcharts' online export server.
if (typeof window !== 'undefined') {
    if (typeof HighchartsExporting === 'function') {
        (HighchartsExporting as unknown as (hc: typeof Highcharts) => void)(Highcharts);
    }
    if (typeof HighchartsOfflineExporting === 'function') {
        (HighchartsOfflineExporting as unknown as (hc: typeof Highcharts) => void)(Highcharts);
    }
    (window as unknown as { jspdf: { jsPDF: typeof jsPDF } }).jspdf = { jsPDF };
}

interface RevenueExpenseChartProps {
    title: string;
    data: DashboardRevenueExpensePoint[];
}

/** Grouped monthly column chart — Revenue vs Expense, side by side per month. */
export default function RevenueExpenseChart({ title, data }: RevenueExpenseChartProps) {
    const money = useMoneyFormat();
    const chartRef = useRef<HighchartsReact.RefObject>(null);

    const categories = data.map((point) => point.label);

    const options: Highcharts.Options = {
        chart: {
            type: 'column',
            height: 380,
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'inherit',
            },
        },
        title: {
            text: undefined,
        },
        credits: {
            enabled: false,
        },
        xAxis: {
            categories: categories,
            labels: {
                rotation: -45,
                style: {
                    fontSize: '11px',
                    color: '#64748b',
                },
            },
            lineColor: '#e2e8f0',
            tickColor: '#e2e8f0',
        },
        yAxis: {
            title: {
                text: 'Amount (BDT)',
                style: {
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: '500',
                },
            },
            labels: {
                style: {
                    color: '#64748b',
                    fontSize: '11px',
                },
                formatter: function () {
                    const value = Number(this.value);
                    if (value >= 1000000) {
                        return `${value / 1000000}M`;
                    }
                    if (value >= 1000) {
                        return `${value / 1000}K`;
                    }
                    return `${value}`;
                },
            },
            gridLineDashStyle: 'Dash',
            gridLineColor: '#f1f5f9',
            min: 0,
        },
        tooltip: {
            shared: true,
            useHTML: true,
            backgroundColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderRadius: 6,
            shadow: {
                color: 'rgba(0, 0, 0, 0.05)',
                offsetX: 0,
                offsetY: 2,
                opacity: 0.1,
                width: 3,
            },
            formatter: function () {
                const points = this.points ?? [];
                const label = points[0]?.key ?? '';
                const rows = points
                    .map(
                        (point) =>
                            `<div style="display: flex; items-center; gap: 6px; color: #475569;">
                                <span style="color: ${point.color}; font-size: 14px;">●</span>
                                <span>${point.series.name}: <b>${money(Number(point.y))}</b></span>
                            </div>`,
                    )
                    .join('');

                return `
                    <div style="padding: 4px 6px; font-size: 12px; line-height: 1.4;">
                        <div style="font-weight: 600; color: #1e293b; margin-bottom: 2px;">${label}</div>
                        ${rows}
                    </div>
                `;
            },
        },
        legend: {
            enabled: true,
            itemStyle: {
                color: '#475569',
                fontSize: '12px',
                fontWeight: '500',
            },
        },
        plotOptions: {
            column: {
                borderRadius: 3,
                groupPadding: 0.15,
                pointPadding: 0.05,
            },
        },
        exporting: {
            enabled: true,
            // These charts must never depend on Highcharts' online export
            // server (this app's environment can't reach it) — offline
            // export (registered above) handles PNG/JPEG/SVG/PDF entirely
            // client-side, so a silent network fallback would only mask
            // real export failures.
            fallbackToExportServer: false,
            buttons: {
                contextButton: {
                    menuItems: ['viewFullscreen', 'printChart', 'separator', 'downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG'],
                    symbolStroke: '#64748b',
                    theme: {
                        fill: '#f8fafc',
                        stroke: '#e2e8f0',
                        states: {
                            hover: {
                                fill: '#f1f5f9',
                            },
                        },
                    },
                },
            },
        },
        series: [
            {
                type: 'column',
                name: 'Revenue',
                data: data.map((point) => point.revenue),
                color: '#34d399', // Emerald — money in
            },
            {
                type: 'column',
                name: 'Expense',
                data: data.map((point) => point.expense),
                color: '#fb7185', // Rose — money out
            },
        ],
    };

    return (
        <div className="bg-card rounded-xl border p-4 shadow-xs">
            <div className="mb-4 flex items-center gap-3 border-b pb-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
                    <BarChart3 className="size-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">{title}</h3>
            </div>

            <div className="w-full">
                <HighchartsReact highcharts={Highcharts} options={options} ref={chartRef} />
            </div>
        </div>
    );
}
