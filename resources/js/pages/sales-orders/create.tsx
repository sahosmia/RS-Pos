import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import AccountPaymentRows, { type PaymentRow } from '@/components/shared/account-payment-rows';
import MoneyInput from '@/components/shared/money-input';
import ProductSearchInput, { type ProductOption } from '@/components/shared/product-search-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CustomerOption } from '@/types/models';
import { Head, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface SalesOrdersCreateProps {
    customers: CustomerOption[];
    products: ProductOption[];
    accounts: Account[];
}

interface OrderItemRow {
    product_id: number;
    name: string;
    sku: string;
    quantity: number;
    unit_price: number;
}

const today = () => new Date().toISOString().slice(0, 10);

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Sales Order', href: '/sales-orders' },
    { title: 'Add', href: '/sales-orders/create' },
];

export default function SalesOrdersCreate({ customers, products, accounts }: SalesOrdersCreateProps) {
    const money = useMoneyFormat();
    const [items, setItems] = useState<OrderItemRow[]>([]);
    const [payments, setPayments] = useState<PaymentRow[]>([]);

    const form = useForm({
        customer_id: customers[0]?.id ?? 0,
        order_date: today(),
        expected_delivery_date: '',
    });

    const addProduct = (product: ProductOption) => {
        setItems((current) => {
            const existing = current.findIndex((item) => item.product_id === product.id);

            if (existing !== -1) {
                const next = [...current];
                next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 };
                return next;
            }

            return [...current, { product_id: product.id, name: product.name, sku: product.sku, quantity: 1, unit_price: product.selling_price }];
        });
    };

    const updateItem = (index: number, changes: Partial<OrderItemRow>) => {
        setItems((current) => current.map((item, i) => (i === index ? { ...item, ...changes } : item)));
    };

    const removeItem = (index: number) => setItems((current) => current.filter((_, i) => i !== index));

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const advanceTotal = payments.reduce((sum, row) => sum + (row.amount || 0), 0);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({
            ...data,
            expected_delivery_date: data.expected_delivery_date || null,
            items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price })),
            payments,
        }));

        form.post(route('sales-orders.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Sales Order" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Add Sales Order" description="অগ্রিম বুকিং — এখনো stock কমবে না" />

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="customer_id">Customer</Label>
                            <Select
                                value={form.data.customer_id ? String(form.data.customer_id) : ''}
                                onValueChange={(value) => form.setData('customer_id', Number(value))}
                            >
                                <SelectTrigger id="customer_id">
                                    <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map((customer) => (
                                        <SelectItem key={customer.id} value={String(customer.id)}>
                                            {customer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.customer_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="order_date">Order Date</Label>
                            <Input
                                id="order_date"
                                type="date"
                                value={form.data.order_date}
                                onChange={(e) => form.setData('order_date', e.target.value)}
                                required
                            />
                            <InputError message={form.errors.order_date} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="expected_delivery_date">Expected Delivery</Label>
                            <Input
                                id="expected_delivery_date"
                                type="date"
                                value={form.data.expected_delivery_date}
                                onChange={(e) => form.setData('expected_delivery_date', e.target.value)}
                            />
                            <InputError message={form.errors.expected_delivery_date} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Products</Label>
                        <ProductSearchInput products={products} onSelect={addProduct} />
                        <InputError message={form.errors.items} />
                    </div>

                    {items.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Product</th>
                                        <th className="px-4 py-2 text-right font-medium">Quantity</th>
                                        <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                                        <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                                        <th className="px-4 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.product_id} className="border-t">
                                            <td className="px-4 py-2">
                                                {item.name} <span className="text-muted-foreground">({item.sku})</span>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <Input
                                                    type="number"
                                                    min={0.01}
                                                    step="0.01"
                                                    className="ml-auto w-24 text-right"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <MoneyInput
                                                    className="ml-auto w-32 text-right"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(item.quantity * item.unit_price)}</td>
                                            <td className="px-4 py-2 text-right">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t font-medium">
                                        <td className="px-4 py-2" colSpan={3}>
                                            Total
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">{money(totalAmount)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    <AccountPaymentRows
                        accounts={accounts}
                        rows={payments}
                        onChange={setPayments}
                        label="Advance Payment (optional)"
                        emptyHint="কোনো advance না নিলে পুরো অর্ডারটাই বকেয়া/বুকিং হিসেবে থাকবে"
                    />
                    {advanceTotal > totalAmount && totalAmount > 0 && (
                        <p className="text-destructive text-xs">Advance total ({money(advanceTotal)}) অর্ডারের total-এর চেয়ে বেশি হয়ে গেছে।</p>
                    )}

                    <Button type="submit" disabled={items.length === 0 || form.processing}>
                        {form.processing ? 'Saving...' : 'Create Sales Order'}
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
