import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type SaleReturnCreateSale } from '@/types/models';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface SaleReturnsCreateProps {
    sale: SaleReturnCreateSale;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Sale Returns', href: '/sale-returns' },
    { title: 'Create', href: '#' },
];

export default function SaleReturnsCreate({ sale }: SaleReturnsCreateProps) {
    const form = useForm({
        sale_id: sale.id,
        return_date: new Date().toISOString().slice(0, 10),
        reason: '',
        quantities: Object.fromEntries(sale.items.map((item) => [item.id, 0])) as Record<number, number>,
    });

    const setQuantity = (saleItemId: number, value: number) => {
        form.setData('quantities', { ...form.data.quantities, [saleItemId]: value });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({
            sale_id: data.sale_id,
            return_date: data.return_date,
            reason: data.reason || null,
            items: sale.items
                .filter((item) => (data.quantities[item.id] ?? 0) > 0)
                .map((item) => ({ sale_item_id: item.id, quantity: data.quantities[item.id] })),
        }));

        form.post(route('sale-returns.store'));
    };

    const hasAnyQuantity = Object.values(form.data.quantities).some((quantity) => quantity > 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Sale Return" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Create Sale Return" description={`${sale.invoice_no} — ${sale.customer.name}`} />

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid max-w-xs gap-2">
                        <Label htmlFor="return_date">Return Date</Label>
                        <Input
                            id="return_date"
                            type="date"
                            value={form.data.return_date}
                            onChange={(e) => form.setData('return_date', e.target.value)}
                            required
                        />
                        <InputError message={form.errors.return_date} />
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Product</th>
                                    <th className="px-4 py-2 text-right font-medium">Sold</th>
                                    <th className="px-4 py-2 text-right font-medium">Already Returned</th>
                                    <th className="px-4 py-2 text-right font-medium">Remaining</th>
                                    <th className="px-4 py-2 text-right font-medium">Return Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.items.map((item) => {
                                    const remaining = item.quantity - item.already_returned;

                                    return (
                                        <tr key={item.id} className="border-t">
                                            <td className="px-4 py-2">
                                                {item.product.name} <span className="text-muted-foreground">({item.product.sku})</span>
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{item.already_returned}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{remaining}</td>
                                            <td className="px-4 py-2 text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={remaining}
                                                    step="0.01"
                                                    className="ml-auto w-24 text-right"
                                                    value={form.data.quantities[item.id]}
                                                    onChange={(e) => setQuantity(item.id, Number(e.target.value))}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {Object.entries(form.errors)
                        .filter(([key]) => key !== 'return_date')
                        .map(([key, message]) => (
                            <InputError key={key} message={message} />
                        ))}

                    <div className="grid max-w-md gap-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea id="reason" value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} rows={3} />
                    </div>

                    <Button type="submit" disabled={!hasAnyQuantity || form.processing}>
                        {form.processing ? 'Saving...' : 'Create Return'}
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
