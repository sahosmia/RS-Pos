import { useMoneyFormat } from '@/hooks/use-money-format';
import { useState } from 'react';

export interface SalesBarChartPoint {
    /** Stable identity for the point (a date or "YYYY-MM"), not shown directly. */
    key: string;
    /** What's shown under the bar / in the tooltip. */
    label: string;
    total: number;
}

interface SalesBarChartProps {
    title: string;
    description?: string;
    data: SalesBarChartPoint[];
    /** Every Nth label is shown under the axis — the rest stay hoverable-only, so 30 daily bars don't collide. */
    labelEvery?: number;
}

const CHART_HEIGHT = 160;

/**
 * A single-series magnitude-over-time bar chart — no legend needed (one
 * series, named by the title), so this is deliberately just bars + a hover
 * tooltip rather than pulling in a charting library for something this
 * simple. Uses the shadcn `--chart-1` token so it already has a correct
 * dark-mode value instead of a hand-picked color.
 */
export default function SalesBarChart({ title, description, data, labelEvery = 1 }: SalesBarChartProps) {
    const money = useMoneyFormat();
    const [hovered, setHovered] = useState<number | null>(null);

    const max = Math.max(1, ...data.map((point) => point.total));
    const total = data.reduce((sum, point) => sum + point.total, 0);
    const barGap = 2;
    const barWidth = 100 / data.length;

    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-sm font-medium">{title}</h3>
                    {description && <p className="text-muted-foreground text-xs">{description}</p>}
                </div>
                <p className="text-right text-sm font-semibold tabular-nums">{money(total)}</p>
            </div>

            <div className="relative">
                <svg viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible">
                    <line x1={0} y1={CHART_HEIGHT - 1} x2={100} y2={CHART_HEIGHT - 1} className="stroke-border" strokeWidth={0.5} />
                    {data.map((point, index) => {
                        const barHeight = (point.total / max) * (CHART_HEIGHT - 12);
                        const x = index * barWidth;

                        return (
                            <rect
                                key={point.key}
                                x={x + barGap / 2}
                                y={CHART_HEIGHT - 1 - barHeight}
                                width={Math.max(barWidth - barGap, 0.5)}
                                height={barHeight}
                                rx={1.5}
                                className={hovered === index ? 'fill-[hsl(var(--chart-1))]' : 'fill-[hsl(var(--chart-1))] opacity-80'}
                                onMouseEnter={() => setHovered(index)}
                                onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
                            />
                        );
                    })}
                </svg>

                {hovered !== null && (
                    <div
                        className="bg-popover text-popover-foreground pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-md"
                        style={{ left: `${(hovered + 0.5) * barWidth}%` }}
                    >
                        <div className="font-medium">{data[hovered].label}</div>
                        <div className="tabular-nums">{money(data[hovered].total)}</div>
                    </div>
                )}
            </div>

            <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
                {data.map((point, index) =>
                    index % labelEvery === 0 ? (
                        <span key={point.key} className="truncate">
                            {point.label}
                        </span>
                    ) : (
                        <span key={point.key} />
                    ),
                )}
            </div>
        </div>
    );
}
