import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import DiscountModal, { discountAmountFor, type DiscountTypeValue } from '@/components/sales/discount-modal';
import MoneyInput from '@/components/shared/money-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { today } from '@/lib/format-date';
import {
    type PurchaseFormDetail,
    type PurchaseFormItem,
    type PurchaseProductOption,
    type PurchaseStatusValue,
    type SupplierOption,
} from '@/types/models';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface PurchaseFormProps {
    mode: 'create' | 'edit';
    purchase?: PurchaseFormDetail;
    /** The already-picked supplier's data — `null` for a fresh create form. */
    initialSupplier: SupplierOption | null;
    /** Every product referenced by `purchase.items` — empty for a fresh create form. */
    initialProducts: PurchaseProductOption[];
}

const emptyItem: PurchaseFormItem = {
    product_id: 0,
    quantity: 1,
    original_price: 0,
    unit_price: 0,
    discount_type: null,
    discount_value: 0,
};

/**
 * Re-keys a `{ index: T }` map after an item at `removedIndex` is spliced
 * out — every entry past it shifts down by one, matching the new `items` array.
 */
function reindexAfterRemoval<T>(map: Record<number, T>, removedIndex: number): Record<number, T> {
    const next: Record<number, T> = {};

    for (const [key, entry] of Object.entries(map)) {
        const index = Number(key);

        if (index < removedIndex) {
            next[index] = entry;
        } else if (index > removedIndex) {
            next[index - 1] = entry;
        }
    }

    return next;
}

export default function PurchaseForm({ mode, purchase, initialSupplier, initialProducts }: PurchaseFormProps) {
    const money = useMoneyFormat();

    const form = useForm({
        supplier_id: purchase?.supplier_id ?? 0,
        purchase_date: purchase?.purchase_date ?? today(),
        status: (purchase?.status ?? 'draft') as PurchaseStatusValue,
        discount_type: (purchase?.discount_type ?? null) as DiscountTypeValue,
        discount_value: purchase?.discount_value ?? 0,
        items: purchase?.items ?? ([] as PurchaseFormItem[]),
    });

    const [supplier, setSupplier] = useState<SupplierOption | null>(initialSupplier);
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
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== index),
        );
    };

    const subtotal = form.data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const invoiceDiscountAmount = discountAmountFor(subtotal, form.data.discount_type, form.data.discount_value);
    const grandTotal = subtotal - invoiceDiscountAmount;

    const editingItem = itemDiscountIndex !== null ? form.data.items[itemDiscountIndex] : null;
    const editingItemOriginalPrice = editingItem
        ? (editingItem.original_price ?? editingItem.unit_price ?? 0)
        : 0;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (mode === 'edit' && purchase) {
            form.patch(route('purchases.update', purchase.id), { onSuccess: () => toast.success('Purchase updated.') });
        } else {
            form.post(route('purchases.store'), { onSuccess: () => toast.success('Purchase created.') });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="supplier_id" required>
                        Supplier
                    </Label>
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
                    <InputError message={form.errors.supplier_id} />
                </div>

                <FormInput
                    id="purchase_date"
                    label="Purchase Date"
                    type="date"
                    value={form.data.purchase_date}
                    onChange={(e) => form.setData('purchase_date', e.target.value)}
                    error={form.errors.purchase_date}
                    required
                />

                <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={form.data.status} onValueChange={(value) => form.setData('status', value as PurchaseStatusValue)}>
                        <SelectTrigger id="status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="ordered">Ordered</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs">Received হতে হলে confirm করতে হবে — stock/ledger তখনই আপডেট হয়</p>
                    <InputError message={form.errors.status} />
                </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                    <Label>Search Product</Label>
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
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
                        <p className="text-sm font-medium">No items added yet</p>
                        <p className="text-muted-foreground text-xs">উপরের সার্চবক্সে প্রোডাক্ট সিলেক্ট করলে এখানে নতুন row যোগ হবে</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-muted-foreground">
                                <tr>
                                    <th className="py-2 text-left font-medium">Product</th>
                                    <th className="w-28 py-2 text-right font-medium">Quantity</th>
                                    <th className="w-36 py-2 text-right font-medium">Unit Cost</th>
                                    <th className="w-32 py-2 text-right font-medium">Subtotal</th>
                                    <th className="w-10 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.data.items.map((item, index) => {
                                    const product = selectedProducts[item.product_id];
                                    return (
                                        <tr key={index} className="border-t">
                                            <td className="py-2 pr-2">
                                                <div className="font-medium">{product?.name ?? `Product #${item.product_id}`}</div>
                                                {product?.sku && <div className="text-muted-foreground text-xs font-mono">{product.sku}</div>}
                                                <InputError message={(form.errors as Record<string, string>)[`items.${index}.product_id`]} />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <FormInput
                                                    id={`purchase-item-${index}-quantity`}
                                                    type="number"
                                                    step="1"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value)) })}
                                                    placeholder="1"
                                                    className="text-right"
                                                />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <div className="space-y-1">
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
                                                        className="text-right"
                                                    />
                                                    <div className="flex items-center justify-end gap-1 text-xs">
                                                        {item.discount_type ? (
                                                            <span className="text-emerald-600 font-medium dark:text-emerald-400">
                                                                {item.discount_type === 'percentage'
                                                                    ? `${item.discount_value}%`
                                                                    : `-${money(item.discount_value ?? 0)}`}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">Discount</span>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-5"
                                                            onClick={() => setItemDiscountIndex(index)}
                                                            aria-label="Edit discount"
                                                        >
                                                            <Pencil className="size-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2 pr-2 text-right tabular-nums font-semibold">
                                                {money(item.quantity * item.unit_price)}
                                            </td>
                                            <td className="py-2 text-right">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t font-medium">
                                    <td colSpan={3} className="py-2 text-right">
                                        Subtotal
                                    </td>
                                    <td className="py-2 text-right tabular-nums">{money(subtotal)}</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="py-1 text-right text-sm">
                                        <div className="flex items-center justify-end gap-1">
                                            <span>Discount</span>
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
                                        </div>
                                    </td>
                                    <td className="py-1 text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                                        -{money(invoiceDiscountAmount)}
                                    </td>
                                    <td></td>
                                </tr>
                                <tr className="border-t font-semibold text-base">
                                    <td colSpan={3} className="py-2 text-right">
                                        Total
                                    </td>
                                    <td className="py-2 text-right tabular-nums">{money(grandTotal)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
                <InputError message={form.errors.items} />
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.get(route('purchases.index'))}>
                    Cancel
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Saving...' : mode === 'create' ? 'Create Purchase' : 'Save Changes'}
                </Button>
            </div>

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
        </form>
    );
}
