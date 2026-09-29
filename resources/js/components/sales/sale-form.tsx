import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import DiscountModal, { discountAmountFor, type DiscountTypeValue } from '@/components/sales/discount-modal';
import FinancingModal from '@/components/sales/financing-modal';
import QuickAddCustomerModal from '@/components/sales/quick-add-customer-modal';
import AccountPaymentRows, { paymentRowsError, type PaymentRow } from '@/components/shared/account-payment-rows';
import MoneyInput from '@/components/shared/money-input';
import ProductSearchInput, { type ProductOption } from '@/components/shared/product-search-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    AlertCircle,
    Check,
    CreditCard,
    History,
    MessageCircle,
    Package,
    Pencil,
    Plus,
    Save,
    Sparkles,
    Trash2,
    UserRound,
    X,
    type LucideIcon,
} from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CartSheetDraft {
    product: ProductOption;
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
    initialCustomer: CustomerOption | null;
    products: ProductOption[];
    accounts: Account[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

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

/**
 * Section card — consistent look for every block of the form.
 * Uses a subtle icon chip + title + optional description and right-side slot.
 */
function FormSection({
    icon: Icon,
    title,
    description,
    accent = 'sky',
    action,
    children,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    accent?: 'sky' | 'violet' | 'emerald' | 'amber';
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    const chip = {
        sky: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
        violet: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
        emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
        amber: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
    }[accent];

    return (
        <Card className="overflow-hidden shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg ring-1', chip)}>
                        <Icon className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
                        {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
                    </div>
                </div>
                {action}
            </CardHeader>
            <CardContent className="p-4">{children}</CardContent>
        </Card>
    );
}

/** Small keyboard hint pill, e.g. F2 / Esc */
function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px] font-medium">
            {children}
        </kbd>
    );
}

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
            .then((r) => (r.ok ? r.json() : { sales: [] }))
            .then((b) => setRecentSales(b.sales ?? []))
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
        const existingIndex = form.data.items.findIndex((i) => i.product_id === product.id);
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
        recent.items.forEach((ri) => {
            const product = products.find((p) => p.id === ri.product_id);
            if (!product) return;
            const idx = items.findIndex((i) => i.product_id === product.id);
            if (idx >= 0) {
                items[idx] = { ...items[idx], quantity: items[idx].quantity + ri.quantity };
            } else {
                items.push({
                    ...emptyItem(product),
                    quantity: ri.quantity,
                    original_price: ri.unit_price,
                    unit_price: ri.unit_price,
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
        form.setData('items', form.data.items.filter((_, i) => i !== index));
    };

    const productById = (id: number) => products.find((p) => p.id === id);

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
        if (!product) return;
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
        if (!cartSheet) return;
        const { product, index, quantity, originalPrice, unitPrice, discountType, discountValue, installationRequired, installationCharge, serialNumbers } = cartSheet;

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
            const existingIndex = form.data.items.findIndex((i) => i.product_id === product.id);
            if (existingIndex >= 0) {
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

    const subtotal = form.data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const discountAmount = discountAmountFor(subtotal, form.data.discount_type, form.data.discount_value);
    const total = subtotal - discountAmount;

    const editingItem = itemDiscountIndex !== null ? form.data.items[itemDiscountIndex] : undefined;
    const editingItemOriginalPrice = editingItem?.original_price ?? 0;

    const submitAs = (status: 'draft' | 'quotation' | 'confirmed', onSuccess?: (page: Page) => void) => {
        if (form.data.items.length === 0) return;
        setPendingStatus(status);
        form.transform((data) => ({
            ...data,
            status,
            source: historical ? 'imported' : 'manual',
            payments: status === 'confirmed' ? payments.filter((r) => r.account_id && r.amount > 0) : [],
        }));
        const options = {
            preserveScroll: true,
            onSuccess: (page: Page) => {
                toast.success(mode === 'edit' ? 'Sale invoice updated.' : 'Sale invoice saved.');
                onSuccess?.(page);
            },
            onError: (errors: Record<string, string>) =>
                toast.error(paymentRowsError(errors) ?? 'Could not save the sale — check the form for errors.'),
        };
        if (mode === 'edit' && sale) form.patch(route('sales.update', sale.id), options);
        else form.post(route('sales.store'), options);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        submitAs(pendingStatus);
    };

    const submitWithWhatsapp = () => {
        if (!customer) return;
        if (!customer.phone) {
            toast.error('এই গ্রাহকের কোনো ফোন নাম্বার নেই — হোয়াটসঅ্যাপ পাঠানো যাবে না।');
            return;
        }
        const oldDue = Math.max(customer.balance, 0);
        const itemLines = form.data.items.map((i) => ({
            name: productById(i.product_id)?.name ?? 'Item',
            quantity: i.quantity,
            unitPrice: i.unit_price,
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
        <form ref={formRef} onSubmit={submit} className={cn('space-y-5', isMobile && form.data.items.length > 0 && 'pb-24')}>
            {/* ───────────────────────── Customer Section ───────────────────────── */}
            <FormSection
                icon={UserRound}
                title="Customer & Date"
                description="গ্রাহক নির্বাচন করুন অথবা নতুন যোগ করুন"
                accent="sky"
            >
                <div className="grid gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                        <FormInput
                            id="sale_date"
                            label="Sale Date"
                            type="date"
                            value={form.data.sale_date}
                            onChange={(e) => form.setData('sale_date', e.target.value)}
                            error={form.errors.sale_date}
                            required
                        />
                    </div>

                    <div className="sm:col-span-7">
                        <Label htmlFor="customer_id" required>
                            Customer
                        </Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <SearchableSelect
                                    id="customer_id"
                                    value={customer}
                                    onChange={(next) => {
                                        setCustomer(next);
                                        form.setData('customer_id', next?.id ?? 0);
                                    }}
                                    getLabel={(o) => o.display_name}
                                    getSublabel={(o) => o.phone ?? ''}
                                    searchUrl={route('contacts.search')}
                                    searchParams={{ type: 'customer' }}
                                    placeholder="Search a customer by name or phone"
                                />
                            </div>
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label="New Customer"
                                            onClick={() => setQuickAddOpen(true)}
                                            className="shrink-0"
                                        >
                                            <Plus className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>New Customer</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <InputError message={form.errors.customer_id} />
                    </div>
                </div>

                {/* Previous due alert — cleaner, less noisy than a paragraph with emoji */}
                {customer && customer.balance !== 0 && (
                    <div
                        className={cn(
                            'mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                            customer.balance > 0
                                ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                                : 'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-400',
                        )}
                    >
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <span>
                            {customer.balance > 0 ? 'পূর্বের বাকি' : 'অগ্রিম জমা'}:{' '}
                            <strong className="font-semibold tabular-nums">{money(Math.abs(customer.balance))}</strong>
                        </span>
                    </div>
                )}

                {/* Recent sales — cleaner chips */}
                {recentSales.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <History className="size-3.5" />
                            সাম্প্রতিক কেনা
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {recentSales.map((recent) => (
                                <button
                                    key={recent.id}
                                    type="button"
                                    onClick={() => addRecentSale(recent)}
                                    className="group flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                                >
                                    <Sparkles className="size-3 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                                    <span className="max-w-[200px] truncate font-medium">
                                        {recent.items.map((i) => i.product_name).join(', ')}
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">{money(recent.total_amount)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </FormSection>

            {/* ───────────────────────── Products Section ───────────────────────── */}
            <FormSection
                icon={Package}
                title="Products"
                description={isMobile ? 'প্রোডাক্ট ট্যাপ করে cart-এ যোগ করুন' : 'Search করে line-item যোগ করুন'}
                accent="violet"
                action={
                    !isMobile ? (
                        <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
                            <Kbd>F2</Kbd> to search
                        </span>
                    ) : null
                }
            >
                <ProductSearchInput
                    ref={searchRef}
                    products={products}
                    onSelect={isMobile ? openCartSheetForNewProduct : addProduct}
                />

                {/* Empty state — friendlier and more informative */}
                {form.data.items.length === 0 && (
                    <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                            <Package className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No products yet</p>
                        <p className="text-muted-foreground max-w-xs text-xs">
                            Search above to add a product. Press <Kbd>F2</Kbd> to jump to the search field.
                        </p>
                    </div>
                )}

                {/* Mobile item list */}
                {isMobile && form.data.items.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {form.data.items.map((item, index) => {
                            const product = productById(item.product_id);
                            return (
                                <div key={index} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">{product?.name}</div>
                                        <div className="text-muted-foreground text-xs tabular-nums">
                                            {item.quantity} × {money(item.unit_price)} = {money(item.quantity * item.unit_price)}
                                        </div>
                                        {item.installation_required && (
                                            <div className="text-muted-foreground text-xs">+ Installation {money(item.installation_charge ?? 0)}</div>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => openCartSheetForEdit(index)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => removeItem(index)}>
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Desktop table */}
                {!isMobile && form.data.items.length > 0 && (
                    <div className="mt-4 overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-muted-foreground">
                                <tr>
                                    <th className="py-2.5 pl-3 text-left text-xs font-medium uppercase tracking-wide">Product</th>
                                    <th className="w-20 py-2.5 text-right text-xs font-medium uppercase tracking-wide">Qty</th>
                                    <th className="w-40 py-2.5 text-right text-xs font-medium uppercase tracking-wide">Price</th>
                                    <th className="w-32 py-2.5 text-right text-xs font-medium uppercase tracking-wide">Discount</th>
                                    <th className="w-28 py-2.5 pr-3 text-right text-xs font-medium uppercase tracking-wide">Subtotal</th>
                                    <th className="w-10 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.data.items.map((item, index) => {
                                    const product = productById(item.product_id);
                                    return (
                                        <tr key={index} className="hover:bg-muted/30 border-t align-top transition-colors">
                                            <td className="py-2.5 pr-2 pl-3">
                                                <div className="font-medium">{product?.name}</div>
                                                <div className="text-muted-foreground text-xs">{product?.sku}</div>
                                                {product?.has_installation_service && (
                                                    <label className="mt-1.5 flex items-center gap-1.5 text-xs">
                                                        <Checkbox
                                                            checked={item.installation_required}
                                                            onCheckedChange={(c) => updateItem(index, { installation_required: c === true })}
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
                                                        className="mt-1.5 h-7 text-xs"
                                                    />
                                                )}
                                            </td>
                                            <td className="py-2.5 pr-2">
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
                                            <td className="py-2.5 pr-2">
                                                <MoneyInput
                                                    value={item.original_price}
                                                    onChange={(e) => {
                                                        const originalPrice = Number(e.target.value);
                                                        updateItem(index, {
                                                            original_price: originalPrice,
                                                            unit_price: round2(
                                                                originalPrice - discountAmountFor(originalPrice, item.discount_type, item.discount_value),
                                                            ),
                                                        });
                                                    }}
                                                    className="ml-auto w-36 text-right"
                                                />
                                            </td>
                                            <td className="py-2.5 pr-2">
                                                <div className="flex items-center justify-end gap-1">
                                                    <div className="text-right">
                                                        {item.discount_type ? (
                                                            <>
                                                                <div className="text-xs font-medium tabular-nums">
                                                                    {item.discount_type === 'percentage'
                                                                        ? `${item.discount_value}%`
                                                                        : `-${money(item.discount_value)}`}
                                                                </div>
                                                                <div className="text-muted-foreground text-[10px] tabular-nums">
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
                                            <td className="py-2.5 pr-3 text-right font-medium tabular-nums">
                                                {money(item.quantity * item.unit_price)}
                                            </td>
                                            <td className="py-2.5 text-right">
                                                <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => removeItem(index)}>
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
            </FormSection>

            {/* ───────────────────────── Payment & Summary ───────────────────────── */}
            <FormSection
                icon={CreditCard}
                title="Payment"
                description="পেমেন্ট এখনই নিন অথবা পুরোটা বকেয়া রাখুন"
                accent="emerald"
                action={
                    <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
                        <Kbd>F4</Kbd> to jump
                    </span>
                }
            >
                <div ref={paymentSectionRef} className="grid gap-5 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <AccountPaymentRows
                            accounts={accounts}
                            rows={payments}
                            onChange={setPayments}
                            emptyHint="Confirm করার সময় পেমেন্ট না দিলে পুরোটা বকেয়া থাকবে"
                            total={total}
                            error={paymentRowsError(form.errors)}
                        />
                    </div>

                    {/* Order Summary — cleaner card with better typography */}
                    <div className="lg:col-span-2">
                        <div className="overflow-hidden rounded-lg border">
                            <div className="bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Order Summary
                            </div>
                            <div className="space-y-2 p-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="tabular-nums">{money(subtotal)}</span>
                                </div>

                                {shop.emi_module_enabled && (
                                    <div className="flex items-center justify-between">
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

                                <div className="flex items-center justify-between">
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
                                    <span className="tabular-nums text-rose-600 dark:text-rose-400">
                                        {discountAmount > 0 ? `-${money(discountAmount)}` : money(0)}
                                    </span>
                                </div>

                                <div className="border-t pt-2">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-sm font-semibold">Total</span>
                                        <span className="text-lg font-bold tabular-nums">{money(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {form.errors.installment_count && <InputError message={form.errors.installment_count} />}
                    </div>
                </div>

                {/* Advanced — collapsed by default, cleaner */}
                <details className="mt-4 rounded-lg border bg-muted/20">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium">
                        <span className="inline-flex items-center gap-2">
                            <span className="text-muted-foreground">Advanced options</span>
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                optional
                            </Badge>
                        </span>
                    </summary>
                    <div className="space-y-3 border-t px-3 py-3">
                        <div className="grid gap-2 sm:max-w-xs">
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
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={historical} onCheckedChange={(c) => setHistorical(c === true)} />
                            Historical record (won't affect stock or balances)
                        </label>
                    </div>
                </details>

                {/* Action bar */}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                    <Button type="button" variant="ghost" onClick={() => router.get(route('sales.index'))} className="gap-1.5">
                        <X className="size-4" />
                        Cancel
                        <Kbd>Esc</Kbd>
                    </Button>
                    <Button type="button" variant="outline" disabled={form.processing} onClick={() => submitAs('draft')} className="gap-1.5">
                        <Save className="size-4" />
                        Draft
                    </Button>
                    <Button type="button" variant="outline" disabled={form.processing} onClick={() => submitAs('quotation')}>
                        Quotation
                    </Button>
                    <Button
                        type="button"
                        disabled={form.processing || form.data.items.length === 0}
                        onClick={() => submitAs('confirmed')}
                        className="gap-1.5"
                    >
                        <Check className="size-4" />
                        {form.processing ? 'Saving...' : 'Confirm Sale'}
                        <Kbd>↵</Kbd>
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
            </FormSection>

            {/* ───────────────────────── Mobile Sticky Bar ───────────────────────── */}
            {isMobile && form.data.items.length > 0 && (
                <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t p-3 shadow-lg backdrop-blur">
                    <div>
                        <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Total</div>
                        <div className="text-lg font-bold tabular-nums">{money(total)}</div>
                    </div>
                    <Button type="button" disabled={form.processing} onClick={() => submitAs('confirmed')} className="gap-1.5">
                        <Check className="size-4" />
                        {form.processing ? 'Saving...' : 'Complete Sale'}
                    </Button>
                </div>
            )}

            {/* Modals (unchanged) */}
            <QuickAddCustomerModal
                open={quickAddOpen}
                onOpenChange={setQuickAddOpen}
                onCreated={(created) => {
                    setCustomer(created);
                    form.setData('customer_id', created.id);
                }}
            />

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
                                            onCheckedChange={(c) => setCartSheet({ ...cartSheet, installationRequired: c === true })}
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
