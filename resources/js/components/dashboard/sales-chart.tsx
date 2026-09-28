import { useMoneyFormat } from '@/hooks/use-money-format';
import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import HighchartsReact from 'highcharts-react-official';
import { jsPDF } from 'jspdf';
import { ShoppingCart } from 'lucide-react';
import { useEffect, useRef } from 'react';
import 'svg2pdf.js';

// Highcharts' exporting modules touch `window` at import time — guard for SSR.
// `downloadPDF`/`downloadSVG` need the offline-exporting module (canvas/SVG-based,
// no network call) plus jsPDF + svg2pdf attached to `window.jspdf` — without these,
// Highcharts silently POSTs to its own online export server instead, which this
// app's environment can't reach, so the PDF button does nothing.
if (typeof window !== 'undefined') {
    if (typeof HighchartsExporting === 'function') {
        (HighchartsExporting as unknown as (hc: typeof Highcharts) => void)(Highcharts);
    }
    if (typeof HighchartsOfflineExporting === 'function') {
        (HighchartsOfflineExporting as unknown as (hc: typeof Highcharts) => void)(Highcharts);
    }
    (window as unknown as { jspdf: { jsPDF: typeof jsPDF } }).jspdf = { jsPDF };
}

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

export default function SalesChart({ title, data, seriesName = 'Total Sales' }: SalesChartProps) {
    const money = useMoneyFormat();
    const chartRef = useRef<HighchartsReact.RefObject>(null);

    const categories = data.map((point) => point.label);
    const seriesData = data.map((point) => point.total);

    const options: Highcharts.Options = {
        chart: {
            type: 'line',
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
                text: 'Total Sales (BDT)',
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
                // Destructuring (not a bare `const point = this`) sidesteps
                // @typescript-eslint/no-this-alias while keeping the same
                // readability — Highcharts only gives us `this` here, a plain
                // formatter callback has no other way to reach it.
                const { x, y, key, series } = this;
                const valueFormatted = money(Number(y));
                // On a categorized xAxis, `x` is the numeric index into `categories`,
                // not the label. `key` is Highcharts' own category-aware label, so
                // prefer it and only fall back to manual indexing if it's ever missing.
                const label = key ?? categories[x as number] ?? x;
                return `
                    <div style="padding: 4px 6px; font-size: 12px; line-height: 1.4;">
                        <div style="font-weight: 600; color: #1e293b; margin-bottom: 2px;">${label}</div>
                        <div style="display: flex; items-center; gap: 6px; color: #475569;">
                            <span style="color: #60a5fa; font-size: 14px;">●</span>
                            <span>${series.name}: <b>${valueFormatted}</b></span>
                        </div>
                    </div>
                `;
            },
        },
        legend: {
            enabled: false,
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
                        r: 4,
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
                type: 'line',
                name: seriesName,
                data: seriesData,
                color: '#60a5fa', // Light blue line
                lineWidth: 2.5,
                marker: {
                    enabled: true,
                    radius: 4,
                    fillColor: '#60a5fa',
                    states: {
                        hover: {
                            radius: 6,
                        },
                    },
                },
            },
        ],
    };

    return (
        <div className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="mb-4 flex items-center gap-3 border-b pb-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300">
                    <ShoppingCart className="size-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">{title}</h3>
            </div>

            <div className="w-full">
                <HighchartsReact highcharts={Highcharts} options={options} ref={chartRef} />
            </div>
        </div>
    );
}
