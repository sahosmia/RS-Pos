import QuickAddContactModal from '@/components/contacts/quick-add-contact-modal';
import { FormInput } from '@/components/form/form-input';
import { LabelTooltip } from '@/components/form/label-tooltip';
import InputError from '@/components/input-error';
import SerialNumbersModal from '@/components/purchases/serial-numbers-modal';
import DiscountModal, { discountAmountFor, type DiscountTypeValue } from '@/components/sales/discount-modal';
import AccountPaymentRows, { paymentRowsError, type PaymentRow } from '@/components/shared/account-payment-rows';
import MoneyInput from '@/components/shared/money-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { today } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import {
    type Account,
    type PurchaseFormDetail,
    type PurchaseFormItem,
    type PurchaseProductOption,
    type PurchaseStatusValue,
    type SupplierOption,
} from '@/types/models';
import { Link, router, useForm } from '@inertiajs/react';
import { Barcode, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface PurchaseFormProps {
    mode: 'create' | 'edit';
    purchase?: PurchaseFormDetail;
    /** The already-picked supplier's data — `null` for a fresh create form. */
    initialSupplier: SupplierOption | null;
    /** Every product referenced by `purchase.items` — empty for a fresh create form. */
    initialProducts: PurchaseProductOption[];
    /** Needed for the payment rows shown when the purchase is saved as Received. */
    accounts: Account[];
}

export default function PurchaseForm({ mode, purchase, initialSupplier, initialProducts, accounts }: PurchaseFormProps) {
    const money = useMoneyFormat();

    const form = useForm({
        supplier_id: purchase?.supplier_id ?? 0,
        purchase_date: purchase?.purchase_date ?? today(),
        // A new purchase starts as Received — the usual case is goods already in hand.
        status: (purchase?.status ?? 'received') as PurchaseStatusValue,
        credit_applied: 0,
        // Keyed by line position — the lines have no ids until they are saved.
        serial_numbers: {} as Record<number, string[]>,
        discount_type: (purchase?.discount_type ?? null) as DiscountTypeValue,
        discount_value: purchase?.discount_value ?? 0,
        // On create, `initialProducts` holds the product picked from the product list (if any) — start with it as one line.
        items:
            purchase?.items ??
            initialProducts.map((product): PurchaseFormItem => ({
                product_id: product.id,
                quantity: 1,
                original_price: product.avg_cost,
                unit_price: product.avg_cost,
                discount_type: null,
                discount_value: 0,
            })),
    });

    const { UnsavedChangesModal } = useUnsavedChangesWarning(form.isDirty, form.processing);

    const [supplier, setSupplier] = useState<SupplierOption | null>(initialSupplier);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
    const [serialLineIndex, setSerialLineIndex] = useState<number | null>(null);
    const [quickAddSupplierOpen, setQuickAddSupplierOpen] = useState(false);
    const [itemDiscountIndex, setItemDiscountIndex] = useState<number | null>(null);
    const [invoiceDiscountOpen, setInvoiceDiscountOpen] = useState(false);

    const [selectedProducts, setSelectedProducts] = useState<Record<number, PurchaseProductOption>>(() => {
        const seeded: Record<number, PurchaseProductOption> = {};
        initialProducts.forEach((product) => {
            seeded[product.id] = product;
        });
        return seeded;
    });

    const addProduct = (product: PurchaseProductOption) => {
        setSelectedProducts((current) => ({ ...current, [product.id]: product }));

        const existingIndex = form.data.items.findIndex((i) => i.product_id === product.id);

        if (existingIndex >= 0) {
            const items = [...form.data.items];
            items[existingIndex] = { ...items[existingIndex], quantity: items[existingIndex].quantity + 1 };
            form.setData('items', items);
        } else {
            form.setData('items', [
                ...form.data.items,
                {
                    product_id: product.id,
                    quantity: 1,
                    original_price: product.avg_cost,
                    unit_price: product.avg_cost,
                    discount_type: null,
                    discount_value: 0,
                },
            ]);
        }
    };

    const updateItem = (index: number, changes: Partial<PurchaseFormItem>) => {
        const items = [...form.data.items];
        items[index] = { ...items[index], ...changes };
        form.setData('items', items);
    };

    const removeItem = (index: number) => {
        // Serials are keyed by line position, so lines after the removed one shift up with their serials.
        const serials: Record<number, string[]> = {};
        Object.entries(form.data.serial_numbers).forEach(([key, value]) => {
            const position = Number(key);
            if (position < index) serials[position] = value;
            if (position > index) serials[position - 1] = value;
        });

        form.setData((data) => ({ ...data, items: data.items.filter((_, i) => i !== index), serial_numbers: serials }));
    };

    const setSerial = (lineIndex: number, unitIndex: number, value: string) => {
        const line = [...(form.data.serial_numbers[lineIndex] ?? [])];
        line[unitIndex] = value;
        form.setData('serial_numbers', { ...form.data.serial_numbers, [lineIndex]: line });
    };

    const subtotal = form.data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const invoiceDiscountAmount = discountAmountFor(subtotal, form.data.discount_type, form.data.discount_value);
    const grandTotal = subtotal - invoiceDiscountAmount;

    const editingItem = itemDiscountIndex !== null ? form.data.items[itemDiscountIndex] : null;
    const editingItemOriginalPrice = editingItem ? (editingItem.original_price ?? editingItem.unit_price ?? 0) : 0;

    const isReceived = form.data.status === 'received';
    const supplierCredit = Math.max(supplier?.balance ?? 0, 0);
    // Money already paid on an earlier save (edit only) — what's entered below is on top of it.
    const alreadyPaid = purchase?.paid_amount ?? 0;
    const stillToPay = Math.max(grandTotal - alreadyPaid - form.data.credit_applied, 0);
    const enteredPayment = paymentRows.reduce((sum, row) => sum + (row.account_id ? row.amount : 0), 0);

    const serialsFilled = (index: number) => (form.data.serial_numbers[index] ?? []).filter((serial) => serial?.trim()).length;
    const serialsMissing = isReceived
        ? form.data.items.filter(
              (item, index) => selectedProducts[item.product_id]?.track_serial_number && serialsFilled(index) < Math.ceil(item.quantity),
          ).length
        : 0;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({
            ...data,
            payments: paymentRows.filter((row) => row.account_id && row.amount > 0),
            // Serials only matter when the goods are received, and only as many as the quantity now says.
            serial_numbers: isReceived
                ? Object.fromEntries(data.items.map((item, index) => [index, (data.serial_numbers[index] ?? []).slice(0, Math.ceil(item.quantity))]))
                : {},
        }));

        const saved = (message: string) => () => {
            form.setDefaults(); // saved: what's on screen is now the baseline, not an unsaved change
            toast.success(message);
        };

        if (mode === 'edit' && purchase) {
            form.patch(route('purchases.update', purchase.id), { onSuccess: saved('Purchase updated.') });
        } else {
            form.post(route('purchases.store'), { onSuccess: saved('Purchase created.') });
        }
    };

    return (
        <form onSubmit={submit} className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="bg-card space-y-4 rounded-xl border p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_9rem]">
                    <div className="grid min-w-0 content-start gap-2">
                        <Label htmlFor="supplier_id" required>
                            Supplier
                        </Label>
                        <div className="flex gap-2">
                            <div className="min-w-0 flex-1">
                                <SearchableSelect
                                    id="supplier_id"
                                    value={supplier}
                                    onChange={(next) => {
                                        setSupplier(next);
                                        form.setData('supplier_id', next?.id ?? 0);
                                    }}
                                    getLabel={(option) => option.display_name}
                                    getSublabel={(option) => option.phone ?? ''}
                                    searchUrl={route('contacts.search')}
                                    searchParams={{ type: 'supplier' }}
                                    placeholder="Search a supplier by name or phone"
                                />
                            </div>
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label="New Supplier"
                                            onClick={() => setQuickAddSupplierOpen(true)}
                                            className="shrink-0"
                                        >
                                            <Plus className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>New Supplier</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <InputError message={form.errors.supplier_id} />
                    </div>

                    <FormInput
                        id="purchase_date"
                        label="Date"
                        type="date"
                        value={form.data.purchase_date}
                        onChange={(e) => form.setData('purchase_date', e.target.value)}
                        error={form.errors.purchase_date}
                        required
                    />

                    <div className="grid min-w-0 content-start gap-2">
                        <Label htmlFor="status" required>
                            <LabelTooltip
                                label="Status"
                                tooltip="Draft/Ordered অবস্থায় stock ও ledger বদলায় না। Received বেছে সেভ করলে মাল হাতে পাওয়া ধরে stock, avg cost ও supplier ledger তখনই আপডেট হয় — আর ফেরানো যায় না (শুধু Cancel/Return)। Payment যেকোনো status-এই দেওয়া যায়।"
                            />
                        </Label>
                        <Select value={form.data.status} onValueChange={(value) => form.setData('status', value as PurchaseStatusValue)}>
                            <SelectTrigger id="status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="ordered">Ordered</SelectItem>
                                <SelectItem value="received">Received</SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.status} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <SearchableSelect<PurchaseProductOption>
                            value={null}
                            onChange={(product) => product && addProduct(product)}
                            getLabel={(option) => option.name}
                            getSublabel={(option) => `${option.sku} · Cost: ${money(option.avg_cost)}`}
                            searchUrl={route('products.search')}
                            placeholder="পণ্য সিলেক্ট করুন (নাম, SKU বা বারকোড দিয়ে সার্চ করুন)"
                        />
                    </div>

                    {form.data.items.length === 0 ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">পণ্য খুঁজে যোগ করুন</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-muted-foreground">
                                    <tr className="text-xs font-medium tracking-wide uppercase">
                                        <th className="py-2.5 pl-3 text-left">Product</th>
                                        <th className="w-24 py-2.5 pr-2 text-right">Qty</th>
                                        <th className="w-40 py-2.5 pr-2 text-right">Unit Cost</th>
                                        <th className="w-32 py-2.5 pr-3 text-right">Subtotal</th>
                                        <th className="w-10 py-2.5"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.data.items.map((item, index) => {
                                        const product = selectedProducts[item.product_id];
                                        return (
                                            <tr key={index} className="hover:bg-muted/30 border-t align-middle transition-colors">
                                                <td className="py-2.5 pr-2 pl-3">
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <Link
                                                            href={route('products.show', item.product_id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="truncate font-medium underline-offset-2 hover:underline"
                                                            title={product?.name ?? `Product #${item.product_id}`}
                                                        >
                                                            {product?.name ?? `Product #${item.product_id}`}
                                                        </Link>
                                                        {item.discount_type && (
                                                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                                {item.discount_type === 'percentage'
                                                                    ? `-${item.discount_value}%`
                                                                    : `-${money(item.discount_value ?? 0)}`}
                                                            </span>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground size-5"
                                                            onClick={() => setItemDiscountIndex(index)}
                                                            aria-label="Edit discount"
                                                            title="Edit discount"
                                                        >
                                                            <Pencil className="size-3" />
                                                        </Button>
                                                        {isReceived && product?.track_serial_number && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className={cn(
                                                                    'h-6 shrink-0 gap-1 px-2 text-xs',
                                                                    serialsFilled(index) < Math.ceil(item.quantity) &&
                                                                        'border-amber-500/60 text-amber-600 dark:text-amber-400',
                                                                )}
                                                                onClick={() => setSerialLineIndex(index)}
                                                            >
                                                                <Barcode className="size-3" />
                                                                Serials {serialsFilled(index)}/{Math.ceil(item.quantity)}
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {product?.sku && <div className="text-muted-foreground font-mono text-xs">{product.sku}</div>}
                                                    <InputError message={(form.errors as Record<string, string>)[`serial_numbers.${index}`]} />
                                                    <InputError message={(form.errors as Record<string, string>)[`items.${index}.product_id`]} />
                                                </td>
                                                <td className="py-2.5 pr-2">
                                                    <FormInput
                                                        id={`purchase-item-${index}-quantity`}
                                                        type="number"
                                                        step="1"
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value)) })}
                                                        placeholder="1"
                                                        className="w-full text-right tabular-nums"
                                                    />
                                                </td>
                                                <td className="py-2.5 pr-2">
                                                    <MoneyInput
                                                        value={item.original_price ?? item.unit_price}
                                                        onChange={(e) => {
                                                            const orig = Number(e.target.value);
                                                            const disc = discountAmountFor(
                                                                orig,
                                                                item.discount_type as DiscountTypeValue,
                                                                item.discount_value ?? 0,
                                                            );
                                                            updateItem(index, {
                                                                original_price: orig,
                                                                unit_price: orig - disc,
                                                            });
                                                        }}
                                                        className="w-full text-right tabular-nums"
                                                    />
                                                </td>
                                                <td className="py-2.5 pr-3 text-right align-middle font-semibold tabular-nums">
                                                    {money(item.quantity * item.unit_price)}
                                                </td>
                                                <td className="py-2 pr-2 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 shrink-0"
                                                        onClick={() => removeItem(index)}
                                                        aria-label={`Remove ${product?.name ?? `product #${item.product_id}`}`}
                                                    >
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
                </div>
            </div>

            <div className="bg-card space-y-5 rounded-xl border p-4 lg:sticky lg:top-4">
                <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="tabular-nums">{money(subtotal)}</span>
                    </div>
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
                        <span className={invoiceDiscountAmount > 0 ? 'text-rose-600 tabular-nums dark:text-rose-400' : 'tabular-nums'}>
                            {invoiceDiscountAmount > 0 ? `-${money(invoiceDiscountAmount)}` : money(0)}
                        </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-2">
                        <span className="font-semibold">Total</span>
                        <span className="text-2xl font-bold tabular-nums">{money(grandTotal)}</span>
                    </div>
                    {(alreadyPaid > 0 || enteredPayment + form.data.credit_applied > 0) && (
                        <div className="text-muted-foreground space-y-1 border-t pt-2 text-xs">
                            {alreadyPaid > 0 && (
                                <div className="flex justify-between">
                                    <span>Already paid</span>
                                    <span className="tabular-nums">{money(alreadyPaid)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>Due after saving</span>
                                <span className="text-foreground font-medium tabular-nums">{money(Math.max(stillToPay - enteredPayment, 0))}</span>
                            </div>
                        </div>
                    )}
                </div>

                {supplierCredit > 0 && (
                    <FormInput
                        id="credit_applied"
                        label={`Supplier credit (available ${money(supplierCredit)})`}
                        type="number"
                        step="0.01"
                        min={0}
                        max={Math.min(supplierCredit, Math.max(grandTotal - alreadyPaid, 0))}
                        value={form.data.credit_applied}
                        onChange={(e) => form.setData('credit_applied', Number(e.target.value))}
                        error={form.errors.credit_applied}
                    />
                )}

                <AccountPaymentRows
                    accounts={accounts}
                    rows={paymentRows}
                    onChange={setPaymentRows}
                    label="Payment"
                    emptyHint="যেকোনো status-এ payment দেওয়া যায় — না দিলে পুরোটা বকেয়া থাকবে"
                    total={stillToPay}
                    error={(form.errors as Record<string, string | undefined>).payments ?? paymentRowsError(form.errors)}
                />
                <InputError message={(form.errors as Record<string, string | undefined>).error} />

                {isReceived && serialsMissing > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        {serialsMissing}টা product-এর serial বাকি — product-এর পাশের “Serials” বাটনে দিন
                    </p>
                )}

                <div className="space-y-2">
                    <Button type="submit" size="lg" className="w-full" disabled={form.processing}>
                        {form.processing ? 'Saving...' : isReceived ? 'Save & Receive' : mode === 'create' ? 'Create Purchase' : 'Save Changes'}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground w-full"
                        onClick={() => router.get(route('purchases.index'))}
                    >
                        Cancel
                    </Button>
                </div>
            </div>

            <QuickAddContactModal
                type="supplier"
                open={quickAddSupplierOpen}
                onOpenChange={setQuickAddSupplierOpen}
                onCreated={(created) => {
                    setSupplier(created);
                    form.setData('supplier_id', created.id);
                }}
            />

            {serialLineIndex !== null && form.data.items[serialLineIndex] && (
                <SerialNumbersModal
                    open
                    onOpenChange={(open) => !open && setSerialLineIndex(null)}
                    productName={selectedProducts[form.data.items[serialLineIndex].product_id]?.name ?? 'Product'}
                    quantity={form.data.items[serialLineIndex].quantity}
                    serials={form.data.serial_numbers[serialLineIndex] ?? []}
                    onChange={(unitIndex, value) => setSerial(serialLineIndex, unitIndex, value)}
                />
            )}

            {/* Per-item discount modal */}
            <DiscountModal
                open={itemDiscountIndex !== null}
                onOpenChange={(open) => !open && setItemDiscountIndex(null)}
                title="Item Discount"
                baseAmount={editingItemOriginalPrice}
                initialType={(editingItem?.discount_type as DiscountTypeValue) ?? null}
                initialValue={editingItem?.discount_value ?? 0}
                onApply={(type, value) => {
                    if (itemDiscountIndex === null) return;
                    const orig = editingItemOriginalPrice;
                    const disc = discountAmountFor(orig, type, value);
                    updateItem(itemDiscountIndex, {
                        discount_type: type,
                        discount_value: value,
                        original_price: orig,
                        unit_price: orig - disc,
                    });
                }}
            />

            {/* Invoice-level discount modal */}
            <DiscountModal
                open={invoiceDiscountOpen}
                onOpenChange={setInvoiceDiscountOpen}
                title="Purchase Discount"
                baseAmount={subtotal}
                initialType={form.data.discount_type}
                initialValue={form.data.discount_value}
                onApply={(type, value) => {
                    form.setData('discount_type', type);
                    form.setData('discount_value', value);
                }}
            />

            <UnsavedChangesModal />
        </form>
    );
}
