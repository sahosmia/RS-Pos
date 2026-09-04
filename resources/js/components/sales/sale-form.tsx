import InputError from '@/components/input-error';
import QuickAddCustomerModal from '@/components/sales/quick-add-customer-modal';
import AccountPaymentRows, { type PaymentRow } from '@/components/shared/account-payment-rows';
import MoneyInput from '@/components/shared/money-input';
import ProductSearchInput, { type ProductOption } from '@/components/shared/product-search-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type CustomerOption, type RecentSale, type SaleFormDetail, type SaleFormItem } from '@/types/models';
import { router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

interface SaleFormProps {
    mode: 'create' | 'edit';
    sale?: SaleFormDetail;
    customers: CustomerOption[];
    products: ProductOption[];
    accounts: Account[];
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyItem = (product: ProductOption): SaleFormItem => ({
    product_id: product.id,
    quantity: 1,
    unit_price: product.selling_price,
    installation_required: false,
    installation_charge: null,
    note: null,
    serial_numbers: [],
});

export default function SaleForm({ mode, sale, customers: initialCustomers, products, accounts }: SaleFormProps) {
    const money = useMoneyFormat();
    const searchRef = useRef<HTMLInputElement>(null);
    const paymentSectionRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const [customers, setCustomers] = useState(initialCustomers);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [historical, setHistorical] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<'draft' | 'quotation' | 'confirmed'>('confirmed');

    const form = useForm({
        customer_id: sale?.customer_id ?? customers[0]?.id ?? 0,
        sale_date: sale?.sale_date ?? today(),
        discount_type: sale?.discount_type ?? null,
        discount_value: sale?.discount_value ?? 0,
        valid_until: sale?.valid_until ?? '',
        payment_type: sale?.payment_type ?? 'cash',
        items: sale?.items ?? ([] as SaleFormItem[]),
    });

    const selectedCustomer = customers.find((customer) => customer.id === form.data.customer_id);

    useEffect(() => {
        if (!form.data.customer_id) {
            setRecentSales([]);
            return;
        }

        fetch(route('contacts.recent-sales', form.data.customer_id), { headers: { Accept: 'application/json' } })
            .then((response) => (response.ok ? response.json() : { sales: [] }))
            .then((body) => setRecentSales(body.sales ?? []))
            .catch(() => setRecentSales([]));
    }, [form.data.customer_id]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchRef.current?.focus();
            } else if (e.key === 'F4') {
                e.preventDefault();
                paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (e.key === 'Escape') {
                router.get(route('sales.index'));
            } else if (e.key === 'Enter') {
                const tag = (document.activeElement?.tagName ?? '').toLowerCase();
                if (tag !== 'input' && tag !== 'textarea') {
                    e.preventDefault();
                    submitAs('confirmed');
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data]);

    const addProduct = (product: ProductOption) => {
        const existingIndex = form.data.items.findIndex((item) => item.product_id === product.id);

        if (existingIndex >= 0) {
            const items = [...form.data.items];
            items[existingIndex] = { ...items[existingIndex], quantity: items[existingIndex].quantity + 1 };
            form.setData('items', items);
        } else {
            form.setData('items', [...form.data.items, emptyItem(product)]);
        }
    };

    const addRecentSale = (recent: RecentSale) => {
        const items = [...form.data.items];

        recent.items.forEach((recentItem) => {
            const product = products.find((p) => p.id === recentItem.product_id);
            if (!product) return;

            const existingIndex = items.findIndex((item) => item.product_id === product.id);
            if (existingIndex >= 0) {
                items[existingIndex] = { ...items[existingIndex], quantity: items[existingIndex].quantity + recentItem.quantity };
            } else {
                items.push({ ...emptyItem(product), quantity: recentItem.quantity, unit_price: recentItem.unit_price });
            }
        });

        form.setData('items', items);
    };

    const updateItem = (index: number, changes: Partial<SaleFormItem>) => {
        const items = [...form.data.items];
        items[index] = { ...items[index], ...changes };
        form.setData('items', items);
    };

    const removeItem = (index: number) => {
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== index),
        );
    };

    const productById = (id: number) => products.find((product) => product.id === id);

    const subtotal = form.data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const discountAmount =
        form.data.discount_type === 'flat'
            ? Math.min(form.data.discount_value, subtotal)
            : form.data.discount_type === 'percentage'
              ? (subtotal * form.data.discount_value) / 100
              : 0;
    const total = subtotal - discountAmount;

    const submitAs = (status: 'draft' | 'quotation' | 'confirmed') => {
        if (form.data.items.length === 0) {
            return;
        }

        setPendingStatus(status);

        form.transform((data) => ({
            ...data,
            status,
            source: historical ? 'imported' : 'manual',
            payments: status === 'confirmed' ? payments.filter((row) => row.account_id && row.amount > 0) : [],
        }));

        const options = { preserveScroll: true };

        if (mode === 'edit' && sale) {
            form.patch(route('sales.update', sale.id), options);
        } else {
            form.post(route('sales.store'), options);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        submitAs(pendingStatus);
    };

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-6">
            {/* Customer Section */}
            <section className="space-y-3 rounded-lg border p-4">
                <h3 className="font-medium">Customer</h3>

                <div className="flex items-end gap-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="customer_id">Customer</Label>
                        <Select
                            value={form.data.customer_id ? String(form.data.customer_id) : ''}
                            onValueChange={(value) => form.setData('customer_id', Number(value))}
                        >
                            <SelectTrigger id="customer_id">
                                <SelectValue placeholder="Select a customer" />
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
                    <Button type="button" variant="outline" onClick={() => setQuickAddOpen(true)}>
                        <Plus className="mr-1 size-4" />
                        New Customer
                    </Button>
                </div>

                {selectedCustomer && selectedCustomer.balance !== 0 && (
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                        ⚠️ পূর্বের বাকি: {money(Math.abs(selectedCustomer.balance))} {selectedCustomer.balance < 0 && '(advance)'}
                    </p>
                )}

                {recentSales.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-sm">📋 সাম্প্রতিক কেনা</p>
                        <div className="flex flex-wrap gap-2">
                            {recentSales.map((recent) => (
                                <Button key={recent.id} type="button" variant="outline" size="sm" onClick={() => addRecentSale(recent)}>
                                    {recent.items.map((i) => i.product_name).join(', ')} — {money(recent.total_amount)} (+আবার)
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Product Section */}
            <section className="space-y-3 rounded-lg border p-4">
                <h3 className="font-medium">Products</h3>

                <ProductSearchInput ref={searchRef} products={products} onSelect={addProduct} />

                {form.data.items.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-muted-foreground">
                                <tr>
                                    <th className="py-2 text-left font-medium">Product</th>
                                    <th className="w-24 py-2 text-right font-medium">Qty</th>
                                    <th className="w-32 py-2 text-right font-medium">Price</th>
                                    <th className="w-28 py-2 text-right font-medium">Subtotal</th>
                                    <th className="w-10 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.data.items.map((item, index) => {
                                    const product = productById(item.product_id);
                                    return (
                                        <tr key={index} className="border-t align-top">
                                            <td className="py-2 pr-2">
                                                <div className="font-medium">{product?.name}</div>
                                                <div className="text-muted-foreground text-xs">{product?.sku}</div>

                                                {product?.has_installation_service && (
                                                    <label className="mt-1 flex items-center gap-1.5 text-xs">
                                                        <Checkbox
                                                            checked={item.installation_required}
                                                            onCheckedChange={(checked) =>
                                                                updateItem(index, { installation_required: checked === true })
                                                            }
                                                        />
                                                        Installation
                                                        {item.installation_required && (
                                                            <MoneyInput
                                                                value={item.installation_charge ?? 0}
                                                                onChange={(e) => updateItem(index, { installation_charge: Number(e.target.value) })}
                                                                className="ml-1 h-7 w-24"
                                                            />
                                                        )}
                                                    </label>
                                                )}

                                                {product?.track_serial_number && (
                                                    <Input
                                                        placeholder="Serial numbers, comma separated"
                                                        value={item.serial_numbers.join(', ')}
                                                        onChange={(e) =>
                                                            updateItem(index, {
                                                                serial_numbers: e.target.value.split(',').map((s) => s.trim()),
                                                            })
                                                        }
                                                        className="mt-1 h-7 text-xs"
                                                    />
                                                )}
                                            </td>
                                            <td className="py-2 pr-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                                                    className="text-right"
                                                />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <MoneyInput
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                                                    className="text-right"
                                                />
                                                {product && item.unit_price < product.selling_price && (
                                                    <p className="text-muted-foreground text-right text-xs">
                                                        -{money(product.selling_price - item.unit_price)}/unit
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-2 pr-2 text-right tabular-nums">{money(item.quantity * item.unit_price)}</td>
                                            <td className="py-2 text-right">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <InputError message={form.errors.items} />
            </section>

            {/* Payment Section */}
            <section ref={paymentSectionRef} className="space-y-4 rounded-lg border p-4">
                <h3 className="font-medium">Payment</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="sale_date">Sale Date</Label>
                        <Input
                            id="sale_date"
                            type="date"
                            value={form.data.sale_date}
                            onChange={(e) => form.setData('sale_date', e.target.value)}
                            required
                        />
                        <InputError message={form.errors.sale_date} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="valid_until">Quotation Valid Until</Label>
                        <Input
                            id="valid_until"
                            type="date"
                            value={form.data.valid_until ?? ''}
                            onChange={(e) => form.setData('valid_until', e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">শুধু "Save as Quotation"-এর জন্য দরকার</p>
                        <InputError message={form.errors.valid_until} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-2">
                            <Label htmlFor="discount_type">Discount</Label>
                            <Select
                                value={form.data.discount_type ?? 'none'}
                                onValueChange={(value) => form.setData('discount_type', value === 'none' ? null : (value as 'flat' | 'percentage'))}
                            >
                                <SelectTrigger id="discount_type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="flat">Flat</SelectItem>
                                    <SelectItem value="percentage">Percentage</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {form.data.discount_type && (
                            <div className="grid gap-2">
                                <Label htmlFor="discount_value">Value</Label>
                                <Input
                                    id="discount_value"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={form.data.discount_value}
                                    onChange={(e) => form.setData('discount_value', Number(e.target.value))}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-1 rounded-lg border p-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="tabular-nums">{money(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="tabular-nums">-{money(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums">{money(total)}</span>
                    </div>
                </div>

                <AccountPaymentRows
                    accounts={accounts}
                    rows={payments}
                    onChange={setPayments}
                    emptyHint="Confirm করার সময় পেমেন্ট না দিলে পুরোটা বকেয়া থাকবে"
                />

                <details className="rounded-lg border p-3">
                    <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                        <Checkbox checked={historical} onCheckedChange={(checked) => setHistorical(checked === true)} />
                        Historical record (won't affect stock or balances)
                    </label>
                </details>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.get(route('sales.index'))}>
                        Cancel (Esc)
                    </Button>
                    <Button type="button" variant="outline" disabled={form.processing} onClick={() => submitAs('draft')}>
                        Save as Draft
                    </Button>
                    <Button type="button" variant="outline" disabled={form.processing} onClick={() => submitAs('quotation')}>
                        Save as Quotation
                    </Button>
                    <Button type="button" disabled={form.processing || form.data.items.length === 0} onClick={() => submitAs('confirmed')}>
                        {form.processing ? 'Saving...' : 'Confirm Sale (Enter)'}
                    </Button>
                </div>
            </section>

            <QuickAddCustomerModal
                open={quickAddOpen}
                onOpenChange={setQuickAddOpen}
                onCreated={(customer) => {
                    setCustomers((current) => [...current, customer]);
                    form.setData('customer_id', customer.id);
                }}
            />
        </form>
    );
}
