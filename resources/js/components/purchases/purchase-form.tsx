import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
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
import { Trash2 } from 'lucide-react';
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

const emptyItem: PurchaseFormItem = { product_id: 0, quantity: 1, unit_price: 0 };

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
        items: purchase?.items ?? [{ ...emptyItem }],
    });

    const [supplier, setSupplier] = useState<SupplierOption | null>(initialSupplier);

    // Selected product per item row, keyed by row index — the form's own `items` only carries
    // `product_id` for submission, this is purely so each row's picker can show a label (doc/corrections2.md #8:
    // the full product catalog is no longer preloaded, so a row can't just look its id up in a big local array).
    const [selectedProducts, setSelectedProducts] = useState<Record<number, PurchaseProductOption>>(() => {
        const byId = new Map(initialProducts.map((product) => [product.id, product]));
        const seeded: Record<number, PurchaseProductOption> = {};

        (purchase?.items ?? []).forEach((item, index) => {
            const product = byId.get(item.product_id);

            if (product) {
                seeded[index] = product;
            }
        });

        return seeded;
    });

    const updateItem = (index: number, changes: Partial<PurchaseFormItem>) => {
        const items = [...form.data.items];
        items[index] = { ...items[index], ...changes };
        form.setData('items', items);
    };

    const onProductChange = (index: number, product: PurchaseProductOption | null) => {
        setSelectedProducts((current) => {
            const next = { ...current };

            if (product) {
                next[index] = product;
            } else {
                delete next[index];
            }

            return next;
        });
        updateItem(index, { product_id: product?.id ?? 0, unit_price: product?.avg_cost ?? 0 });
    };

    const addItem = () => form.setData('items', [...form.data.items, { ...emptyItem }]);

    const removeItem = (index: number) => {
        if (form.data.items.length <= 1) {
            return;
        }

        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== index),
        );
        setSelectedProducts((current) => reindexAfterRemoval(current, index));
    };

    const total = form.data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

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
                        getLabel={(option) => option.name}
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

            <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium">Items</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        Add Item
                    </Button>
                </div>

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
                            {form.data.items.map((item, index) => (
                                <tr key={index} className="border-t">
                                    <td className="py-2 pr-2">
                                        <SearchableSelect
                                            value={selectedProducts[index] ?? null}
                                            onChange={(product) => onProductChange(index, product)}
                                            getLabel={(option) => option.name}
                                            getSublabel={(option) => option.sku}
                                            searchUrl={route('products.search')}
                                            placeholder="Search a product by name, SKU or barcode"
                                        />
                                        <InputError message={(form.errors as Record<string, string>)[`items.${index}.product_id`]} />
                                    </td>
                                    <td className="py-2 pr-2">
                                        <FormInput
                                            id={`purchase-item-${index}-quantity`}
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
                                    </td>
                                    <td className="py-2 pr-2 text-right tabular-nums">{money(item.quantity * item.unit_price)}</td>
                                    <td className="py-2 text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(index)}
                                            disabled={form.data.items.length <= 1}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t font-medium">
                                <td colSpan={3} className="py-2 text-right">
                                    Total
                                </td>
                                <td className="py-2 text-right tabular-nums">{money(total)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
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
        </form>
    );
}
