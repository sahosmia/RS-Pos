import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import AccountPaymentRows, { paymentRowsError, type PaymentRow } from '@/components/shared/account-payment-rows';
import MoneyInput from '@/components/shared/money-input';
import PageHeader from '@/components/shared/page-header';
import ProductSearchInput, { type ProductOption } from '@/components/shared/product-search-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CustomerOption } from '@/types/models';
import { Head, Link, useForm } from '@inertiajs/react';
import { Calendar, ChevronLeft, ClipboardList, Package, Save, Trash2, Wallet, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface SalesOrdersCreateProps {
    /** The already-picked customer's data — `null` for a fresh create form. */
    initialCustomer: CustomerOption | null;
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

export default function SalesOrdersCreate({ initialCustomer, products, accounts }: SalesOrdersCreateProps) {
    const money = useMoneyFormat();
    const [items, setItems] = useState<OrderItemRow[]>([]);
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);

    const form = useForm({
        customer_id: initialCustomer?.id ?? 0,
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

        form.post(route('sales-orders.store'), {
            onSuccess: () => toast.success('Sales order created.'),
            onError: (errors) => toast.error(paymentRowsError(errors) ?? 'Could not save the sales order — check the form for errors.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Sales Order" />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    icon={ClipboardList}
                    iconClassName="bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20 dark:text-teal-400"
                    title="Add Sales Order"
                    description="অগ্রিম বুকিং — এখনো stock কমবে না"
                    actions={
                        <Button variant="outline" asChild className="gap-1.5">
                            <Link href={route('sales-orders.index')}>
                                <ChevronLeft className="size-4" />
                                Back to sales orders
                            </Link>
                        </Button>
                    }
                />

                <form onSubmit={submit} className="space-y-5">
                    {/* Order Details */}
                    <Card className="overflow-hidden shadow-xs">
                        <CardHeader className="bg-muted/30 flex flex-row items-center gap-3 space-y-0 border-b px-4 py-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400">
                                <ClipboardList className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold tracking-tight">Order Details</CardTitle>
                                <p className="text-muted-foreground mt-0.5 text-xs">Customer এবং তারিখ সংক্রান্ত তথ্য</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="grid min-w-0 content-start gap-2">
                                    <Label htmlFor="customer_id" required>
                                        Customer
                                    </Label>
                                    <SearchableSelect
                                        id="customer_id"
                                        value={customer}
                                        onChange={(next) => {
                                            setCustomer(next);
                                            form.setData('customer_id', next?.id ?? 0);
                                        }}
                                        getLabel={(option) => option.display_name}
                                        getSublabel={(option) => option.phone ?? ''}
                                        searchUrl={route('contacts.search')}
                                        searchParams={{ type: 'customer' }}
                                        placeholder="Search customer by name or phone"
                                    />
                                    <InputError message={form.errors.customer_id} />
                                </div>

                                <FormInput
                                    id="order_date"
                                    label="Order Date"
                                    type="date"
                                    value={form.data.order_date}
                                    onChange={(e) => form.setData('order_date', e.target.value)}
                                    error={form.errors.order_date}
                                    icon={Calendar}
                                    required
                                />

                                <FormInput
                                    id="expected_delivery_date"
                                    label="Expected Delivery"
                                    type="date"
                                    value={form.data.expected_delivery_date}
                                    onChange={(e) => form.setData('expected_delivery_date', e.target.value)}
                                    error={form.errors.expected_delivery_date}
                                    icon={Calendar}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Product Selection & Items */}
                    <Card className="overflow-hidden shadow-xs">
                        <CardHeader className="bg-muted/30 flex flex-row items-center gap-3 space-y-0 border-b px-4 py-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400">
                                <Package className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold tracking-tight">Order Items</CardTitle>
                                <p className="text-muted-foreground mt-0.5 text-xs">পণ্য সিলেক্ট করুন ও পরিমাণ নির্ধারণ করুন</p>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                            <div className="grid min-w-0 content-start gap-2">
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
                                                        <span className="font-medium">{item.name}</span>{' '}
                                                        <span className="text-muted-foreground">({item.sku})</span>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            step="1"
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
                                                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                                                        {money(item.quantity * item.unit_price)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t text-base font-semibold">
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
                        </CardContent>
                    </Card>

                    {/* Advance Payment */}
                    <Card className="overflow-hidden shadow-xs">
                        <CardHeader className="bg-muted/30 flex flex-row items-center gap-3 space-y-0 border-b px-4 py-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                                <Wallet className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold tracking-tight">Advance Payment</CardTitle>
                                <p className="text-muted-foreground mt-0.5 text-xs">অগ্রিম গ্রহণ (ঐচ্ছিক)</p>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 p-4">
                            <AccountPaymentRows
                                accounts={accounts}
                                rows={payments}
                                onChange={setPayments}
                                label="Advance Payment (optional)"
                                emptyHint="কোনো advance না নিলে পুরো অর্ডারটাই বকেয়া/বুকিং হিসেবে থাকবে"
                                error={paymentRowsError(form.errors)}
                            />
                            {advanceTotal > totalAmount && totalAmount > 0 && (
                                <p className="text-destructive text-xs font-medium">
                                    Advance total ({money(advanceTotal)}) অর্ডারের total-এর চেয়ে বেশি হয়ে গেছে।
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 border-t pt-4">
                        <Button type="button" variant="ghost" onClick={() => window.history.back()} className="gap-1.5">
                            <X className="size-4" />
                            Cancel
                        </Button>
                        <Button type="submit" disabled={items.length === 0 || form.processing} className="gap-1.5">
                            <Save className="size-4" />
                            {form.processing ? 'Saving...' : 'Create Sales Order'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
