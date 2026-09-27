import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import DiscountModal, { discountAmountFor, type DiscountTypeValue } from '@/components/sales/discount-modal';
import FinancingModal from '@/components/sales/financing-modal';
import QuickAddCustomerModal from '@/components/sales/quick-add-customer-modal';
import AccountPaymentRows, { paymentRowsError, type PaymentRow } from '@/components/shared/account-payment-rows';
import MoneyInput from '@/components/shared/money-input';
import ProductSearchInput, { type ProductOption } from '@/components/shared/product-search-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { today } from '@/lib/format-date';
import { buildSaleWhatsappMessage, openWhatsapp } from '@/lib/sale-whatsapp-message';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { type Account, type CustomerOption, type RecentSale, type SaleFormDetail, type SaleFormItem } from '@/types/models';
import { type Page } from '@inertiajs/core';
import { router, useForm, usePage } from '@inertiajs/react';
import { CreditCard, MessageCircle, Package, Pencil, Plus, Trash2, UserRound, type LucideIcon } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/** The mobile bottom-sheet's in-progress edit — committed to `items` only on confirm. */
interface CartSheetDraft {
    product: ProductOption;
    /** `null` while adding a new line; the item's index while editing an existing one. */
    index: number | null;
    quantity: number;
    originalPrice: number;
    unitPrice: number;
    discountType: DiscountTypeValue;
    discountValue: number;
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

/** Matches the backend's `round($value, 2)` for the client-side price recompute after applying a discount. */
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Icon-chip + title header, matching the dashboard widgets' card style (e.g. `sales-chart.tsx`) for a consistent look across the app. */
function SectionHeader({ icon: Icon, title, color = 'sky' }: { icon: LucideIcon; title: string; color?: 'sky' | 'violet' | 'emerald' }) {
    const chipClasses = {
        sky: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
        violet: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
        emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
    }[color];

    return (
        <div className="mb-1 flex items-center gap-3 border-b pb-3">
            <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', chipClasses)}>
                <Icon className="size-4" />
            </div>
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        </div>
    );
}

const emptyItem = (product: ProductOption): SaleFormItem => ({
    product_id: product.id,
    quantity: 1,
    original_price: product.selling_price,
    unit_price: product.selling_price,
    discount_type: null,
    discount_value: 0,
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
    /** Index of the desktop item table row whose discount modal is open — `null` means closed. */
    const [itemDiscountIndex, setItemDiscountIndex] = useState<number | null>(null);
    const [cartDiscountOpen, setCartDiscountOpen] = useState(false);
    const [invoiceDiscountOpen, setInvoiceDiscountOpen] = useState(false);
    const [financingModalOpen, setFinancingModalOpen] = useState(false);

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
                items.push({
                    ...emptyItem(product),
                    quantity: recentItem.quantity,
                    original_price: recentItem.unit_price,
                    unit_price: recentItem.unit_price,
                });
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
            originalPrice: product.selling_price,
            unitPrice: product.selling_price,
            discountType: null,
            discountValue: 0,
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
            originalPrice: item.original_price,
            unitPrice: item.unit_price,
            discountType: item.discount_type,
            discountValue: item.discount_value,
            installationRequired: item.installation_required,
            installationCharge: item.installation_charge,
            serialNumbers: item.serial_numbers,
        });
    };

    const confirmCartSheet = () => {
        if (!cartSheet) {
            return;
        }

        const {
            product,
            index,
            quantity,
            originalPrice,
            unitPrice,
            discountType,
            discountValue,
            installationRequired,
            installationCharge,
            serialNumbers,
        } = cartSheet;

        if (index !== null) {
            updateItem(index, {
                quantity,
                original_price: originalPrice,
                unit_price: unitPrice,
                discount_type: discountType,
                discount_value: discountValue,
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
                        original_price: originalPrice,
                        unit_price: unitPrice,
                        discount_type: discountType,
                        discount_value: discountValue,
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
    const discountAmount = discountAmountFor(subtotal, form.data.discount_type, form.data.discount_value);
    const total = subtotal - discountAmount;

    // Backing data for the desktop item table's discount modal (item 19) — kept as plain
    // derived values rather than local state so they always reflect the current row.
    const editingItem = itemDiscountIndex !== null ? form.data.items[itemDiscountIndex] : undefined;
    const editingItemOriginalPrice = editingItem?.original_price ?? 0;

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

        const options = {
            preserveScroll: true,
            ...(onSuccess ? { onSuccess } : {}),
            onError: (errors: Record<string, string>) =>
                toast.error(paymentRowsError(errors) ?? 'Could not save the sale — check the form for errors.'),
        };

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

    return (
        <form ref={formRef} onSubmit={submit} className={cn('space-y-6', isMobile && form.data.items.length > 0 && 'pb-20')}>
            {/* Sale Date + Customer — merged into one row, date always visible up top */}
            <section className="bg-card space-y-3 rounded-xl border p-4 shadow-xs">
                <SectionHeader icon={UserRound} title="Customer" color="sky" />

                <div className="grid grid-cols-3 gap-3">
                    <FormInput
                        id="sale_date"
                        label="Sale Date"
                        type="date"
                        value={form.data.sale_date}
                        onChange={(e) => form.setData('sale_date', e.target.value)}
                        error={form.errors.sale_date}
                        required
                    />

                    <div className="col-span-1">
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
                            placeholder="Search a customer by name or phone"
                        />
                        <InputError message={form.errors.customer_id} />
                    </div>

                    <div className="flex items-end">
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="New Customer"
                                        onClick={() => setQuickAddOpen(true)}
                                    >
                                        <Plus className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>New Customer</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
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

            {/* Products + Payment — one merged card so the whole "build the sale" flow reads as one unit */}
            <section className="bg-card space-y-4 rounded-xl border p-4 shadow-xs">
                <SectionHeader icon={Package} title="Products" color="violet" />

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
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-muted-foreground">
                                <tr>
                                    <th className="py-2 pl-3 text-left font-medium">Product</th>
                                    <th className="w-24 py-2 text-right font-medium">Qty</th>
                                    <th className="w-40 py-2 text-right font-medium">Price</th>
                                    <th className="w-32 py-2 text-right font-medium">Discount</th>
                                    <th className="w-28 py-2 pr-3 text-right font-medium">Subtotal</th>
                                    <th className="w-10 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.data.items.map((item, index) => {
                                    const product = productById(item.product_id);
                                    return (
                                        <tr key={index} className="hover:bg-muted/30 border-t align-top transition-colors">
                                            <td className="py-2 pr-2 pl-3">
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
                                                    placeholder="1"
                                                    className="text-right"
                                                />
                                            </td>
                                            <td className="py-2 pr-2">
                                                {/* Always the BASE price — editing this recomputes the discounted unit_price
                                                    from whatever discount is already applied, it never clears the discount. */}
                                                <MoneyInput
                                                    value={item.original_price}
                                                    onChange={(e) => {
                                                        const originalPrice = Number(e.target.value);
                                                        updateItem(index, {
                                                            original_price: originalPrice,
                                                            unit_price: round2(
                                                                originalPrice -
                                                                    discountAmountFor(originalPrice, item.discount_type, item.discount_value),
                                                            ),
                                                        });
                                                    }}
                                                    className="ml-auto w-36 text-right"
                                                />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <div className="flex items-center justify-end gap-1">
                                                    <div className="text-right">
                                                        {item.discount_type ? (
                                                            <>
                                                                <div className="tabular-nums">
                                                                    {item.discount_type === 'percentage'
                                                                        ? `${item.discount_value}%`
                                                                        : `-${money(item.discount_value)}`}
                                                                </div>
                                                                <div className="text-muted-foreground text-xs tabular-nums">
                                                                    → {money(item.unit_price)}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">—</span>
                                                        )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7 shrink-0"
                                                        onClick={() => setItemDiscountIndex(index)}
                                                        aria-label="Edit discount"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="py-2 pr-3 text-right tabular-nums">{money(item.quantity * item.unit_price)}</td>
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

                {/* Payment — merged into the same card as Products so the two read as one flow */}
                <div ref={paymentSectionRef} className="space-y-4 border-t pt-4">
                    <SectionHeader icon={CreditCard} title="Payment" color="emerald" />

                    {/* Payment account on the left, the read-only totals summary on the right — the two are related but distinct decisions. */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <AccountPaymentRows
                                accounts={accounts}
                                rows={payments}
                                onChange={setPayments}
                                emptyHint="Confirm করার সময় পেমেন্ট না দিলে পুরোটা বকেয়া থাকবে"
                                total={total}
                                error={paymentRowsError(form.errors)}
                            />
                        </div>

                        <div className="grid gap-1 rounded-lg border p-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="tabular-nums">{money(subtotal)}</span>
                            </div>

                            {shop.emi_module_enabled && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        Financing
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-5"
                                            onClick={() => setFinancingModalOpen(true)}
                                            aria-label="Edit financing"
                                        >
                                            <Pencil className="size-3" />
                                        </Button>
                                    </span>
                                    <span className="tabular-nums">
                                        {form.data.financing_type === 'emi'
                                            ? `EMI${form.data.installment_count ? ` (${form.data.installment_count}x)` : ''}`
                                            : 'One-time'}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    Discount
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-5"
                                        onClick={() => setInvoiceDiscountOpen(true)}
                                        aria-label="Edit discount"
                                    >
                                        <Pencil className="size-3" />
                                    </Button>
                                </span>
                                <span className="tabular-nums">-{money(discountAmount)}</span>
                            </div>
                            <div className="border-primary/20 bg-primary/5 -mx-3 mt-1 -mb-3 flex justify-between rounded-b-lg border-t px-3 py-2 text-base font-semibold">
                                <span>Total</span>
                                <span className="tabular-nums">{money(total)}</span>
                            </div>
                        </div>
                    </div>

                    {form.errors.installment_count && <InputError message={form.errors.installment_count} />}

                    <details className="rounded-lg border p-3">
                        <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
                        <div className="mt-2 grid gap-2 sm:max-w-xs">
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
                        <label className="mt-3 flex items-center gap-2 text-sm">
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
                                    placeholder="1"
                                />
                                <div className="grid gap-2">
                                    <Label htmlFor="cart-price">Price</Label>
                                    {/* Always the BASE price — editing this recomputes unitPrice from whatever discount is already applied, it never clears the discount. */}
                                    <MoneyInput
                                        id="cart-price"
                                        value={cartSheet.originalPrice}
                                        onChange={(e) => {
                                            const originalPrice = Number(e.target.value);
                                            setCartSheet({
                                                ...cartSheet,
                                                originalPrice,
                                                unitPrice: round2(
                                                    originalPrice - discountAmountFor(originalPrice, cartSheet.discountType, cartSheet.discountValue),
                                                ),
                                            });
                                        }}
                                    />
                                    <div className="flex items-center justify-between gap-1">
                                        {cartSheet.discountType ? (
                                            <p className="text-muted-foreground text-xs">
                                                {cartSheet.discountType === 'percentage'
                                                    ? `${cartSheet.discountValue}%`
                                                    : `-${money(cartSheet.discountValue)}`}{' '}
                                                → {money(cartSheet.unitPrice)}
                                            </p>
                                        ) : (
                                            <span />
                                        )}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 gap-1 px-2 text-xs"
                                            onClick={() => setCartDiscountOpen(true)}
                                        >
                                            <Pencil className="size-3" />
                                            Discount
                                        </Button>
                                    </div>
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
                                    onChange={(e) => setCartSheet({ ...cartSheet, serialNumbers: e.target.value.split(',').map((s) => s.trim()) })}
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

            {/* Desktop per-item discount (item 19) */}
            <DiscountModal
                open={itemDiscountIndex !== null}
                onOpenChange={(open) => !open && setItemDiscountIndex(null)}
                title="Item Discount"
                baseAmount={editingItemOriginalPrice}
                initialType={editingItem?.discount_type ?? null}
                initialValue={editingItem?.discount_value ?? 0}
                onApply={(type, value) => {
                    if (itemDiscountIndex === null) return;
                    updateItem(itemDiscountIndex, {
                        discount_type: type,
                        discount_value: value,
                        unit_price: round2(editingItemOriginalPrice - discountAmountFor(editingItemOriginalPrice, type, value)),
                    });
                }}
            />

            {/* Mobile cart-sheet per-item discount (item 19) */}
            <DiscountModal
                open={cartDiscountOpen}
                onOpenChange={setCartDiscountOpen}
                title="Item Discount"
                baseAmount={cartSheet?.originalPrice ?? 0}
                initialType={cartSheet?.discountType ?? null}
                initialValue={cartSheet?.discountValue ?? 0}
                onApply={(type, value) => {
                    if (!cartSheet) return;
                    const originalPrice = cartSheet.originalPrice;
                    setCartSheet({
                        ...cartSheet,
                        discountType: type,
                        discountValue: value,
                        unitPrice: round2(originalPrice - discountAmountFor(originalPrice, type, value)),
                    });
                }}
            />

            {/* Invoice-level discount (item 19) */}
            <DiscountModal
                open={invoiceDiscountOpen}
                onOpenChange={setInvoiceDiscountOpen}
                title="Invoice Discount"
                baseAmount={subtotal}
                initialType={form.data.discount_type}
                initialValue={form.data.discount_value}
                onApply={(type, value) => {
                    form.setData('discount_type', type);
                    form.setData('discount_value', value);
                }}
            />

            {shop.emi_module_enabled && (
                <FinancingModal
                    open={financingModalOpen}
                    onOpenChange={setFinancingModalOpen}
                    initialFinancingType={form.data.financing_type}
                    initialInstallmentCount={form.data.installment_count}
                    installmentCountError={form.errors.installment_count}
                    onApply={(financingType, installmentCount) => {
                        form.setData('financing_type', financingType);
                        form.setData('installment_count', installmentCount);
                    }}
                />
            )}
        </form>
    );
}
