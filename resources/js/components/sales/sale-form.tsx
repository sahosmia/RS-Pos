import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import QuickAddCustomerModal from '@/components/sales/quick-add-customer-modal';
import AccountPaymentRows, { type PaymentRow } from '@/components/shared/account-payment-rows';
import MoneyInput from '@/components/shared/money-input';
import ProductSearchInput, { type ProductOption } from '@/components/shared/product-search-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { today } from '@/lib/format-date';
import { buildSaleWhatsappMessage, openWhatsapp } from '@/lib/sale-whatsapp-message';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { type Account, type CustomerOption, type RecentSale, type SaleFormDetail, type SaleFormItem } from '@/types/models';
import { type Page } from '@inertiajs/core';
import { router, useForm, usePage } from '@inertiajs/react';
import { MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/** The mobile bottom-sheet's in-progress edit — committed to `items` only on confirm. */
interface CartSheetDraft {
    product: ProductOption;
    /** `null` while adding a new line; the item's index while editing an existing one. */
    index: number | null;
    quantity: number;
    unitPrice: number;
    installationRequired: boolean;
    installationCharge: number | null;
    serialNumbers: string[];
}

interface SaleFormProps {
    mode: 'create' | 'edit';
    sale?: SaleFormDetail;
    /** The already-picked customer's data — `null` for a fresh create form. */
    initialCustomer: CustomerOption | null;
    products: ProductOption[];
    accounts: Account[];
}

const emptyItem = (product: ProductOption): SaleFormItem => ({
    product_id: product.id,
    quantity: 1,
    unit_price: product.selling_price,
    installation_required: false,
    installation_charge: null,
    note: null,
    serial_numbers: [],
});

export default function SaleForm({ mode, sale, initialCustomer, products, accounts }: SaleFormProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const isMobile = useIsMobile();
    const searchRef = useRef<HTMLInputElement>(null);
    const paymentSectionRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [historical, setHistorical] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<'draft' | 'quotation' | 'confirmed'>('confirmed');
    const [cartSheet, setCartSheet] = useState<CartSheetDraft | null>(null);

    const form = useForm({
        customer_id: sale?.customer_id ?? initialCustomer?.id ?? 0,
        sale_date: sale?.sale_date ?? today(),
        discount_type: sale?.discount_type ?? null,
        discount_value: sale?.discount_value ?? 0,
        valid_until: sale?.valid_until ?? '',
        financing_type: sale?.financing_type ?? 'one_time',
        installment_count: sale?.installment_count ?? null,
        items: sale?.items ?? ([] as SaleFormItem[]),
    });

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

    /**
     * Mobile cart flow (design doc "cart-style flow") — selecting a product
     * opens this sheet for Quantity/Price/Installation instead of adding it
     * straight to the list; the desktop table keeps editing inline instead.
     */
    const openCartSheetForNewProduct = (product: ProductOption) => {
        setCartSheet({
            product,
            index: null,
            quantity: 1,
            unitPrice: product.selling_price,
            installationRequired: false,
            installationCharge: null,
            serialNumbers: [],
        });
    };

    const openCartSheetForEdit = (index: number) => {
        const item = form.data.items[index];
        const product = productById(item.product_id);
        if (!product) {
            return;
        }

        setCartSheet({
            product,
            index,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            installationRequired: item.installation_required,
            installationCharge: item.installation_charge,
            serialNumbers: item.serial_numbers,
        });
    };

    const confirmCartSheet = () => {
        if (!cartSheet) {
            return;
        }

        const { product, index, quantity, unitPrice, installationRequired, installationCharge, serialNumbers } = cartSheet;

        if (index !== null) {
            updateItem(index, {
                quantity,
                unit_price: unitPrice,
                installation_required: installationRequired,
                installation_charge: installationCharge,
                serial_numbers: serialNumbers,
            });
        } else {
            const existingIndex = form.data.items.findIndex((item) => item.product_id === product.id);

            if (existingIndex >= 0) {
                // Matches desktop's addProduct: re-picking the same product only grows the quantity, price stays as already set.
                updateItem(existingIndex, { quantity: form.data.items[existingIndex].quantity + quantity });
            } else {
                form.setData('items', [
                    ...form.data.items,
                    {
                        product_id: product.id,
                        quantity,
                        unit_price: unitPrice,
                        installation_required: installationRequired,
                        installation_charge: installationCharge,
                        note: null,
                        serial_numbers: serialNumbers,
                    },
                ]);
            }
        }

        setCartSheet(null);
    };

    const subtotal = form.data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const discountAmount =
        form.data.discount_type === 'flat'
            ? Math.min(form.data.discount_value, subtotal)
            : form.data.discount_type === 'percentage'
              ? (subtotal * form.data.discount_value) / 100
              : 0;
    const total = subtotal - discountAmount;

    const submitAs = (status: 'draft' | 'quotation' | 'confirmed', onSuccess?: (page: Page) => void) => {
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

        const options = { preserveScroll: true, ...(onSuccess ? { onSuccess } : {}) };

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

    /**
     * "Save & WhatsApp" — confirms the sale exactly like the regular Confirm
     * button, then opens a `wa.me` click-to-chat link prefilled with the
     * invoice details plus the customer's old and new total due. The final
     * invoice number and post-sale due figures only exist after the save
     * succeeds, so the message is built from the redirect's own page props
     * (`sales.show`'s data) rather than guessed client-side beforehand.
     */
    const submitWithWhatsapp = () => {
        if (!customer) {
            return;
        }

        if (!customer.phone) {
            toast.error('এই গ্রাহকের কোনো ফোন নাম্বার নেই — হোয়াটসঅ্যাপ পাঠানো যাবে না।');
            return;
        }

        const oldDue = Math.max(customer.balance, 0);
        const itemLines = form.data.items.map((item) => ({
            name: productById(item.product_id)?.name ?? 'Item',
            quantity: item.quantity,
            unitPrice: item.unit_price,
        }));

        submitAs('confirmed', (page) => {
            const savedSale = page.props.sale as unknown as {
                invoice_no: string;
                total_amount: number;
                due_amount: number;
                customer: { balance: number };
            };

            openWhatsapp(
                customer.phone!,
                buildSaleWhatsappMessage(
                    {
                        customerName: customer.name,
                        invoiceNo: savedSale.invoice_no,
                        saleDate: form.data.sale_date,
                        items: itemLines,
                        subtotal,
                        discountAmount,
                        totalAmount: savedSale.total_amount,
                        saleDueAmount: savedSale.due_amount,
                        oldDue,
                        newTotalDue: Math.max(savedSale.customer.balance, 0),
                    },
                    money,
                ),
            );
        });
    };

    const discountTypeOptions = [
        { value: 'flat', label: 'Flat' },
        { value: 'percentage', label: 'Percentage' },
    ];
    const financingOptions = [
        { value: 'one_time', label: 'One-time' },
        { value: 'emi', label: 'EMI' },
    ];

    return (
        <form ref={formRef} onSubmit={submit} className={cn('space-y-6', isMobile && form.data.items.length > 0 && 'pb-20')}>
            {/* Customer Section */}
            <section className="space-y-3 rounded-lg border p-4">
                <h3 className="font-medium">Customer</h3>

                <div className="flex items-end gap-2">
                    <div className="flex-1">
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
                            getLabel={(option) => option.name}
                            getSublabel={(option) => option.phone ?? ''}
                            searchUrl={route('contacts.search')}
                            searchParams={{ type: 'customer' }}
                            placeholder="Search a customer by name or phone"
                        />
                        <InputError message={form.errors.customer_id} />
                    </div>
                    <Button type="button" variant="outline" onClick={() => setQuickAddOpen(true)}>
                        <Plus className="mr-1 size-4" />
                        New Customer
                    </Button>
                </div>

                {customer && customer.balance !== 0 && (
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                        ⚠️ পূর্বের বাকি: {money(Math.abs(customer.balance))} {customer.balance < 0 && '(advance)'}
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

                <ProductSearchInput ref={searchRef} products={products} onSelect={isMobile ? openCartSheetForNewProduct : addProduct} />

                {isMobile ? (
                    form.data.items.length > 0 && (
                        <div className="space-y-2">
                            {form.data.items.map((item, index) => {
                                const product = productById(item.product_id);
                                return (
                                    <div key={index} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium">{product?.name}</div>
                                            <div className="text-muted-foreground text-xs tabular-nums">
                                                {item.quantity} × {money(item.unit_price)} = {money(item.quantity * item.unit_price)}
                                            </div>
                                            {item.installation_required && (
                                                <div className="text-muted-foreground text-xs">
                                                    + Installation {money(item.installation_charge ?? 0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => openCartSheetForEdit(index)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : form.data.items.length > 0 ? (
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

                                                {shop.serial_number_module_enabled && product?.track_serial_number && (
                                                    <FormInput
                                                        id={`sale-item-${index}-serials`}
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
                                                <FormInput
                                                    id={`sale-item-${index}-quantity`}
                                                    type="number"
                                                    step="1"
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
                ) : null}
                <InputError message={form.errors.items} />
            </section>

            {/* Payment Section */}
            <section ref={paymentSectionRef} className="space-y-4 rounded-lg border p-4">
                <h3 className="font-medium">Payment</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                        id="sale_date"
                        label="Sale Date"
                        type="date"
                        value={form.data.sale_date}
                        onChange={(e) => form.setData('sale_date', e.target.value)}
                        error={form.errors.sale_date}
                        required
                    />

                    <div className="grid gap-2">
                        <FormInput
                            id="valid_until"
                            label="Quotation Valid Until"
                            type="date"
                            value={form.data.valid_until ?? ''}
                            onChange={(e) => form.setData('valid_until', e.target.value)}
                            error={form.errors.valid_until}
                        />
                        <p className="text-muted-foreground text-xs">শুধু "Save as Quotation"-এর জন্য দরকার</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <FormSelect
                            id="discount_type"
                            label="Discount"
                            value={form.data.discount_type}
                            onChange={(val) => form.setData('discount_type', val as 'flat' | 'percentage' | null)}
                            options={discountTypeOptions}
                            allowNone
                            noneLabel="None"
                        />

                        {form.data.discount_type && (
                            <FormInput
                                id="discount_value"
                                label="Value"
                                type="number"
                                step="0.01"
                                min={0}
                                value={form.data.discount_value}
                                onChange={(e) => form.setData('discount_value', Number(e.target.value))}
                            />
                        )}
                    </div>

                    {shop.emi_module_enabled && (
                        <div className="grid grid-cols-2 gap-2">
                            <FormSelect
                                id="financing_type"
                                label="Financing"
                                value={form.data.financing_type}
                                onChange={(val) => {
                                    if (!val) return;
                                    form.setData('financing_type', val as 'one_time' | 'emi');
                                    if (val === 'one_time') {
                                        form.setData('installment_count', null);
                                    }
                                }}
                                options={financingOptions}
                            />

                            {form.data.financing_type === 'emi' && (
                                <FormInput
                                    id="installment_count"
                                    label="Installments"
                                    type="number"
                                    min={1}
                                    value={form.data.installment_count ?? ''}
                                    onChange={(e) => form.setData('installment_count', e.target.value ? Number(e.target.value) : null)}
                                    error={form.errors.installment_count}
                                />
                            )}

                            {form.data.financing_type === 'emi' && (
                                <p className="text-muted-foreground col-span-2 text-xs">
                                    নিচে account row-এ down payment দিন (না দিলে পুরো amount emi-তে যাবে) — বাকিটা সমান কিস্তিতে ভাগ হবে
                                </p>
                            )}
                        </div>
                    )}
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
                    total={total}
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
                    <Button
                        type="button"
                        disabled={form.processing || form.data.items.length === 0 || !customer}
                        onClick={submitWithWhatsapp}
                        className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                        <MessageCircle className="size-4" />
                        {form.processing ? 'Saving...' : 'Save & WhatsApp'}
                    </Button>
                </div>
            </section>

            <QuickAddCustomerModal
                open={quickAddOpen}
                onOpenChange={setQuickAddOpen}
                onCreated={(created) => {
                    setCustomer(created);
                    form.setData('customer_id', created.id);
                }}
            />

            {/* Mobile cart-style flow (design doc "Mobile multi-item forms — cart-style flow") — running total + primary action stay reachable while scrolling through products. */}
            {isMobile && form.data.items.length > 0 && (
                <div className="bg-background fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t p-3 shadow-lg">
                    <div>
                        <div className="text-muted-foreground text-xs">Total</div>
                        <div className="text-lg font-semibold tabular-nums">{money(total)}</div>
                    </div>
                    <Button type="button" disabled={form.processing} onClick={() => submitAs('confirmed')}>
                        {form.processing ? 'Saving...' : 'Complete Sale'}
                    </Button>
                </div>
            )}

            <Sheet open={cartSheet !== null} onOpenChange={(open) => !open && setCartSheet(null)}>
                <SheetContent side="bottom" className="space-y-4">
                    <SheetHeader>
                        <SheetTitle>{cartSheet?.product.name}</SheetTitle>
                    </SheetHeader>

                    {cartSheet && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <FormInput
                                    id="cart-quantity"
                                    label="Quantity"
                                    type="number"
                                    step="1"
                                    min={0}
                                    value={cartSheet.quantity}
                                    onChange={(e) => setCartSheet({ ...cartSheet, quantity: Number(e.target.value) })}
                                />
                                <div className="grid gap-2">
                                    <Label htmlFor="cart-price">Price</Label>
                                    <MoneyInput
                                        id="cart-price"
                                        value={cartSheet.unitPrice}
                                        onChange={(e) => setCartSheet({ ...cartSheet, unitPrice: Number(e.target.value) })}
                                    />
                                    {cartSheet.unitPrice < cartSheet.product.selling_price && (
                                        <p className="text-muted-foreground text-xs">
                                            -{money(cartSheet.product.selling_price - cartSheet.unitPrice)}/unit
                                        </p>
                                    )}
                                </div>
                            </div>

                            {cartSheet.product.has_installation_service && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={cartSheet.installationRequired}
                                            onCheckedChange={(checked) => setCartSheet({ ...cartSheet, installationRequired: checked === true })}
                                        />
                                        Installation
                                    </label>
                                    {cartSheet.installationRequired && (
                                        <MoneyInput
                                            value={cartSheet.installationCharge ?? 0}
                                            onChange={(e) => setCartSheet({ ...cartSheet, installationCharge: Number(e.target.value) })}
                                        />
                                    )}
                                </div>
                            )}

                            {shop.serial_number_module_enabled && cartSheet.product.track_serial_number && (
                                <FormInput
                                    id="cart-serials"
                                    label="Serial numbers"
                                    placeholder="Comma separated"
                                    value={cartSheet.serialNumbers.join(', ')}
                                    onChange={(e) =>
                                        setCartSheet({ ...cartSheet, serialNumbers: e.target.value.split(',').map((s) => s.trim()) })
                                    }
                                />
                            )}

                            <div className="flex justify-between rounded-lg border p-3 text-sm font-medium">
                                <span>Subtotal</span>
                                <span className="tabular-nums">{money(cartSheet.quantity * cartSheet.unitPrice)}</span>
                            </div>
                        </div>
                    )}

                    <SheetFooter>
                        <Button type="button" variant="outline" onClick={() => setCartSheet(null)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={confirmCartSheet}>
                            {cartSheet?.index !== null ? 'Save Changes' : 'Add to Cart'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </form>
    );
}
