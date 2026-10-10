import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import { jsPDF } from 'jspdf';
import { useEffect, useState } from 'react';
import 'svg2pdf.js';

// Highcharts' exporting modules touch `window` at import time — guard for SSR. Offline export (no network call)
// needs jsPDF + svg2pdf on `window.jspdf`; without them Highcharts silently falls back to its online export
// server, which this app's environment cannot reach. Registered here once for every chart.
if (typeof window !== 'undefined') {
    if (typeof HighchartsExporting === 'function') {
        (HighchartsExporting as unknown as (hc: typeof Highcharts) => void)(Highcharts);
    }
    if (typeof HighchartsOfflineExporting === 'function') {
        (HighchartsOfflineExporting as unknown as (hc: typeof Highcharts) => void)(Highcharts);
    }
    (window as unknown as { jspdf: { jsPDF: typeof jsPDF } }).jspdf = { jsPDF };
}

export interface ChartTheme {
    text: string;
    muted: string;
    grid: string;
    card: string;
    border: string;
    primary: string;
    success: string;
    danger: string;
}

const FALLBACK: ChartTheme = {
    text: '#0f172a',
    muted: '#64748b',
    grid: '#e5e7eb',
    card: '#ffffff',
    border: '#e2e8f0',
    primary: '#4f46e5',
    success: '#16a34a',
    danger: '#e11d48',
};

/** Any CSS colour (hsl, color-mix result…) as a `#rrggbb` string Highcharts can build gradients from. */
function toHex(value: string, fallback: string): string {
    if (typeof document === 'undefined' || value.trim() === '') return fallback;

    const context = document.createElement('canvas').getContext('2d');
    if (!context) return fallback;

    context.fillStyle = '#000000';
    context.fillStyle = value;

    return context.fillStyle;
}

function readTheme(): ChartTheme {
    if (typeof document === 'undefined') return FALLBACK;

    const styles = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => toHex(styles.getPropertyValue(name), fallback);

    return {
        text: read('--foreground', FALLBACK.text),
        muted: read('--muted-foreground', FALLBACK.muted),
        // A hairline between the page and card colours, so grid lines stay quiet in light and dark.
        grid: toHex(
            `color-mix(in oklab, ${styles.getPropertyValue('--brand-border').trim() || FALLBACK.grid} 45%, ${styles.getPropertyValue('--card').trim() || FALLBACK.card})`,
            FALLBACK.grid,
        ),
        card: read('--card', FALLBACK.card),
        border: read('--brand-border', FALLBACK.border),
        primary: read('--brand-primary', FALLBACK.primary),
        success: read('--brand-success', FALLBACK.success),
        danger: read('--brand-danger', FALLBACK.danger),
    };
}

/**
 * The chart colours, read from the app's own CSS variables so a chart follows light/dark mode and the shop's chosen
 * theme colour. Recomputed when either changes (the `dark` class or `data-theme-color` on <html>).
 */
export function useChartTheme(): ChartTheme {
    const [theme, setTheme] = useState<ChartTheme>(FALLBACK);

    useEffect(() => {
        const update = () => setTheme(readTheme());
        update();

        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme-color'] });

        return () => observer.disconnect();
    }, []);

    return theme;
}

/** `#rrggbb` + alpha → `rgba(...)`, for the soft area fill. */
export function withAlpha(hex: string, alpha: number): string {
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!match) return hex;

    return `rgba(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}, ${alpha})`;
}

/** Axis, tooltip, legend and export-button styling shared by every chart. */
export function baseChartOptions(theme: ChartTheme, height = 340): Highcharts.Options {
    return {
        chart: { height, backgroundColor: 'transparent', style: { fontFamily: 'inherit' }, spacing: [8, 4, 4, 4] },
        title: { text: undefined },
        credits: { enabled: false },
        xAxis: {
            lineColor: theme.grid,
            tickColor: 'transparent',
            labels: { style: { color: theme.muted, fontSize: '11px' } },
            crosshair: { width: 1, color: theme.grid },
        },
        yAxis: {
            title: { text: undefined },
            min: 0,
            gridLineColor: theme.grid,
            gridLineWidth: 1,
            labels: {
                style: { color: theme.muted, fontSize: '11px' },
                formatter() {
                    const value = Number(this.value);
                    if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
                    if (value >= 1_000) return `${+(value / 1_000).toFixed(1)}K`;
                    return `${value}`;
                },
            },
        },
        tooltip: {
            useHTML: true,
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderRadius: 10,
            borderWidth: 1,
            shadow: { color: 'rgba(15, 23, 42, 0.18)', offsetX: 0, offsetY: 6, opacity: 0.25, width: 12 },
            style: { color: theme.text },
        },
        legend: {
            align: 'right',
            verticalAlign: 'top',
            itemStyle: { color: theme.text, fontSize: '12px', fontWeight: '500' },
            itemHoverStyle: { color: theme.text },
            symbolRadius: 6,
            symbolHeight: 10,
            symbolWidth: 10,
        },
        exporting: {
            enabled: true,
            // Never fall back to Highcharts' online export server (see the registration note above).
            fallbackToExportServer: false,
            buttons: {
                contextButton: {
                    menuItems: ['viewFullscreen', 'printChart', 'separator', 'downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG'],
                    symbolStroke: theme.muted,
                    theme: {
                        fill: 'transparent',
                        stroke: 'transparent',
                        states: { hover: { fill: withAlpha(theme.muted, 0.15) } },
                    } as Highcharts.ExportingButtonsContextButtonThemeOptions,
                },
            },
        },
    };
}

/** One tooltip row: coloured dot, series name, bold value. */
export function tooltipRow(color: string, name: string, value: string, muted: string): string {
    return `<div style="display:flex;align-items:center;gap:8px;color:${muted};white-space:nowrap">
        <span style="width:8px;height:8px;border-radius:9999px;background:${color};display:inline-block"></span>
        <span>${name}</span><b style="margin-left:auto;padding-left:16px">${value}</b>
    </div>`;
}
