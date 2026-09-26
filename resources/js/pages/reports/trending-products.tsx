import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type TrendingProductRow } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Trending Products', href: '/reports/trending-products' }];

interface TrendingProductsProps {
    from: string;
    to: string;
    rows: TrendingProductRow[];
}

export default function TrendingProducts({ from, to, rows }: TrendingProductsProps) {
    const money = useMoneyFormat();
    const [range, setRange] = useState({ from, to });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(route('reports.trending-products'), range, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Trending Products" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Trending Products" description="সময় অনুযায়ী সবচেয়ে বেশি বিক্রিত পণ্য" />

                <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
                    <FormInput id="from" label="From" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                    <FormInput id="to" label="To" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
                    <Button type="submit" variant="outline">
                        Apply
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Product</th>
                                <th className="px-4 py-2 text-right font-medium">Quantity Sold</th>
                                <th className="px-4 py-2 text-right font-medium">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={row.id} className="border-t">
                                    <td className="px-4 py-2">
                                        #{index + 1} {row.name} <span className="text-muted-foreground">({row.sku})</span>
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{row.quantity_sold}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(row.revenue)}</td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-muted-foreground px-4 py-8 text-center">
                                        এই সময়ে কোনো বিক্রি নেই
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
