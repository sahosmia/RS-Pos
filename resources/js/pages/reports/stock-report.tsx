import HeadingSmall from '@/components/heading-small';
import { MetricCard } from '@/components/shared/metric-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type StockReportRow } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Stock Report', href: '/reports/stock' }];

interface StockReportProps {
    rows: StockReportRow[];
    totalValue: number;
    lowStockCount: number;
}

const statusLabel: Record<StockReportRow['stock_status'], string> = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
};

export default function StockReport({ rows, totalValue, lowStockCount }: StockReportProps) {
    const money = useMoneyFormat();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Stock Report" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Stock Report" description="বর্তমান স্টক ও মূল্য" />

                <div className="grid gap-4 sm:grid-cols-2">
                    <MetricCard label="Total Stock Value" value={money(totalValue)} />
                    <MetricCard label="Low/Out of Stock Products" value={lowStockCount} />
                </div>

                <div className="rounded-brand-card bg-card overflow-x-auto shadow-[var(--brand-card-shadow-elevated)]">
                    <table className="w-full text-sm">
                        <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium">Product</th>
                                <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                                <th className="px-4 py-2.5 text-right font-medium">Avg Cost</th>
                                <th className="px-4 py-2.5 text-right font-medium">Value</th>
                                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
                                    <td className="px-4 py-2">
                                        {row.name} <span className="text-muted-foreground">({row.sku})</span>
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{row.current_stock}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(row.avg_cost)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(row.stock_value)}</td>
                                    <td className="px-4 py-2">
                                        <StatusBadge status={row.stock_status} label={statusLabel[row.stock_status]} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
