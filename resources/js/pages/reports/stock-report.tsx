import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
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

const statusVariant: Record<StockReportRow['stock_status'], 'secondary' | 'outline' | 'destructive'> = {
    in_stock: 'secondary',
    low_stock: 'outline',
    out_of_stock: 'destructive',
};

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
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Total Stock Value</p>
                        <p className="text-xl font-semibold tabular-nums">{money(totalValue)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Low/Out of Stock Products</p>
                        <p className="text-xl font-semibold tabular-nums">{lowStockCount}</p>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Product</th>
                                <th className="px-4 py-2 text-right font-medium">Stock</th>
                                <th className="px-4 py-2 text-right font-medium">Avg Cost</th>
                                <th className="px-4 py-2 text-right font-medium">Value</th>
                                <th className="px-4 py-2 text-left font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="border-t">
                                    <td className="px-4 py-2">
                                        {row.name} <span className="text-muted-foreground">({row.sku})</span>
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{row.current_stock}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(row.avg_cost)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(row.stock_value)}</td>
                                    <td className="px-4 py-2">
                                        <Badge variant={statusVariant[row.stock_status]}>{statusLabel[row.stock_status]}</Badge>
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
