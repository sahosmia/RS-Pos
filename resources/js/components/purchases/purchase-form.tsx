import InputError from '@/components/input-error';
import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type PurchaseFormDetail, type PurchaseFormItem, type PurchaseStatusValue } from '@/types/models';
import { router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { FormEventHandler } from 'react';

interface ProductOption {
    id: number;
    name: string;
    sku: string;
    avg_cost: number;
}

interface SupplierOption {
    id: number;
    name: string;
}

interface PurchaseFormProps {
    mode: 'create' | 'edit';
    purchase?: PurchaseFormDetail;
    suppliers: SupplierOption[];
    products: ProductOption[];
}

const today = () => new Date().toISOString().slice(0, 10);
const emptyItem: PurchaseFormItem = { product_id: 0, quantity: 1, unit_price: 0 };

export default function PurchaseForm({ mode, purchase, suppliers, products }: PurchaseFormProps) {
    const money = useMoneyFormat();

    const form = useForm({
        supplier_id: purchase?.supplier_id ?? suppliers[0]?.id ?? 0,
        purchase_date: purchase?.purchase_date ?? today(),
        status: (purchase?.status ?? 'draft') as PurchaseStatusValue,
        items: purchase?.items ?? [{ ...emptyItem }],
    });

    const productById = (id: number) => products.find((product) => product.id === id);

    const updateItem = (index: number, changes: Partial<PurchaseFormItem>) => {
        const items = [...form.data.items];
        items[index] = { ...items[index], ...changes };
        form.setData('items', items);
    };

    const onProductChange = (index: number, productId: number) => {
        const product = productById(productId);
        updateItem(index, { product_id: productId, unit_price: product?.avg_cost ?? 0 });
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
    };

    const total = form.data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (mode === 'edit' && purchase) {
            form.patch(route('purchases.update', purchase.id));
        } else {
            form.post(route('purchases.store'));
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="supplier_id">Supplier</Label>
                    <Select
                        value={form.data.supplier_id ? String(form.data.supplier_id) : ''}
                        onValueChange={(value) => form.setData('supplier_id', Number(value))}
                    >
                        <SelectTrigger id="supplier_id">
                            <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={String(supplier.id)}>
                                    {supplier.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.supplier_id} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="purchase_date">Purchase Date</Label>
                    <Input
                        id="purchase_date"
                        type="date"
                        value={form.data.purchase_date}
                        onChange={(e) => form.setData('purchase_date', e.target.value)}
                        required
                    />
                    <InputError message={form.errors.purchase_date} />
                </div>

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
                                        <Select
                                            value={item.product_id ? String(item.product_id) : ''}
                                            onValueChange={(value) => onProductChange(index, Number(value))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a product" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map((product) => (
                                                    <SelectItem key={product.id} value={String(product.id)}>
                                                        {product.name} — {product.sku}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={(form.errors as Record<string, string>)[`items.${index}.product_id`]} />
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
