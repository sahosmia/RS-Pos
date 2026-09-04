import InputError from '@/components/input-error';
import LookupManagerModal from '@/components/products/lookup-manager-modal';
import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { type Brand, type Category, type ProductDetail, type Unit } from '@/types/models';
import { router, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface ProductFormProps {
    mode: 'create' | 'edit';
    product?: ProductDetail;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
}

export default function ProductForm({ mode, product, categories, brands, units }: ProductFormProps) {
    const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null);
    const [lookupModal, setLookupModal] = useState<'category' | 'unit' | 'brand' | null>(null);

    const canSetOpeningStock = product ? product.can_set_opening_stock : true;

    const form = useForm({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        barcode: product?.barcode ?? '',
        category_id: product?.category_id ?? categories[0]?.id ?? 0,
        brand_id: product?.brand_id ?? null,
        unit_id: product?.unit_id ?? units[0]?.id ?? 0,
        selling_price: product?.selling_price ?? 0,
        minimum_stock_level: product?.minimum_stock_level ?? 0,
        manage_stock: product?.manage_stock ?? true,
        opening_stock: 0,
        opening_stock_cost: 0,
        warranty_period_months: product?.warranty_period_months ?? null,
        has_installation_service: product?.has_installation_service ?? false,
        emi_available: product?.emi_available ?? false,
        track_serial_number: product?.track_serial_number ?? false,
        is_for_sale: product?.is_for_sale ?? true,
        is_active: product?.is_active ?? true,
        image: null as File | null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { forceFormData: true, onSuccess: () => mode === 'create' && form.reset() };

        if (mode === 'edit' && product) {
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(route('products.update', product.id), options);
        } else {
            form.post(route('products.store'), options);
        }
    };

    const onImageChange = (file: File | null) => {
        form.setData('image', file);
        setImagePreview(file ? URL.createObjectURL(file) : (product?.image_url ?? null));
    };

    return (
        <>
            <form onSubmit={submit} className="space-y-8">
                {/* Section 1 — Basic Info */}
                <section className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">Basic Info</h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Product Name</Label>
                            <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="sku">SKU</Label>
                            <Input id="sku" value={form.data.sku} onChange={(e) => form.setData('sku', e.target.value)} required />
                            <InputError message={form.errors.sku} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="barcode">Barcode</Label>
                            <Input id="barcode" value={form.data.barcode} onChange={(e) => form.setData('barcode', e.target.value)} />
                            <InputError message={form.errors.barcode} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="category_id">Category</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={form.data.category_id ? String(form.data.category_id) : ''}
                                    onValueChange={(value) => form.setData('category_id', Number(value))}
                                >
                                    <SelectTrigger id="category_id" className="flex-1">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={String(category.id)}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="button" variant="outline" size="icon" onClick={() => setLookupModal('category')}>
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            <InputError message={form.errors.category_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="brand_id">Brand</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={form.data.brand_id ? String(form.data.brand_id) : 'none'}
                                    onValueChange={(value) => form.setData('brand_id', value === 'none' ? null : Number(value))}
                                >
                                    <SelectTrigger id="brand_id" className="flex-1">
                                        <SelectValue placeholder="No brand" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No brand</SelectItem>
                                        {brands.map((brand) => (
                                            <SelectItem key={brand.id} value={String(brand.id)}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="button" variant="outline" size="icon" onClick={() => setLookupModal('brand')}>
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            <InputError message={form.errors.brand_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="unit_id">Unit</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={form.data.unit_id ? String(form.data.unit_id) : ''}
                                    onValueChange={(value) => form.setData('unit_id', Number(value))}
                                >
                                    <SelectTrigger id="unit_id" className="flex-1">
                                        <SelectValue placeholder="Select a unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map((unit) => (
                                            <SelectItem key={unit.id} value={String(unit.id)}>
                                                {unit.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="button" variant="outline" size="icon" onClick={() => setLookupModal('unit')}>
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            <InputError message={form.errors.unit_id} />
                        </div>
                    </div>
                </section>

                {/* Section 2 — Pricing & Stock */}
                <section className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">Pricing &amp; Stock</h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="selling_price">Selling Price</Label>
                            <MoneyInput
                                id="selling_price"
                                value={form.data.selling_price}
                                onChange={(e) => form.setData('selling_price', Number(e.target.value))}
                                required
                            />
                            <InputError message={form.errors.selling_price} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="minimum_stock_level">Minimum Stock Level</Label>
                            <Input
                                id="minimum_stock_level"
                                type="number"
                                step="0.01"
                                value={form.data.minimum_stock_level}
                                onChange={(e) => form.setData('minimum_stock_level', Number(e.target.value))}
                            />
                            <InputError message={form.errors.minimum_stock_level} />
                        </div>

                        {mode === 'edit' && product && (
                            <div className="grid gap-2">
                                <Label>Current Stock</Label>
                                <p className="text-muted-foreground text-sm">এটা এখানে বদলানো যাবে না — Stock Adjustment ব্যবহার করুন</p>
                                <p className="text-lg font-medium tabular-nums">{product.current_stock}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
                            <div className="space-y-0.5">
                                <Label htmlFor="manage_stock">Manage Stock</Label>
                                <p className="text-muted-foreground text-sm">
                                    বন্ধ থাকলে এটা সার্ভিস আইটেম (Installation Charge) — stock track হবে না
                                </p>
                            </div>
                            <Switch
                                id="manage_stock"
                                checked={form.data.manage_stock}
                                onCheckedChange={(checked) => form.setData('manage_stock', checked)}
                            />
                        </div>

                        {form.data.manage_stock &&
                            (canSetOpeningStock ? (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="opening_stock">Opening Stock</Label>
                                        <Input
                                            id="opening_stock"
                                            type="number"
                                            step="0.01"
                                            value={form.data.opening_stock}
                                            onChange={(e) => form.setData('opening_stock', Number(e.target.value))}
                                        />
                                        <InputError message={form.errors.opening_stock} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="opening_stock_cost">Opening Stock Unit Cost</Label>
                                        <MoneyInput
                                            id="opening_stock_cost"
                                            value={form.data.opening_stock_cost}
                                            onChange={(e) => form.setData('opening_stock_cost', Number(e.target.value))}
                                        />
                                        <InputError message={form.errors.opening_stock_cost} />
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted-foreground text-sm sm:col-span-2">
                                    এই product-এ ইতিমধ্যে stock movement হয়ে গেছে — opening stock আর বদলানো যাবে না, Stock Adjustment ব্যবহার করুন।
                                </p>
                            ))}
                    </div>
                </section>

                {/* Section 3 — Service & Warranty */}
                <section className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">Service &amp; Warranty</h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="warranty_period_months">Warranty (months)</Label>
                            <Input
                                id="warranty_period_months"
                                type="number"
                                min={0}
                                value={form.data.warranty_period_months ?? ''}
                                onChange={(e) => form.setData('warranty_period_months', e.target.value ? Number(e.target.value) : null)}
                            />
                            <InputError message={form.errors.warranty_period_months} />
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {(
                            [
                                ['has_installation_service', 'Installation Service'],
                                ['emi_available', 'EMI Available'],
                                ['track_serial_number', 'Track Serial Number'],
                            ] as const
                        ).map(([key, label]) => (
                            <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                                <Label htmlFor={key}>{label}</Label>
                                <Switch id={key} checked={form.data[key]} onCheckedChange={(checked) => form.setData(key, checked)} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 4 — Visibility & Media */}
                <section className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">Visibility &amp; Media</h3>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_for_sale">For Sale (POS)</Label>
                                <p className="text-muted-foreground text-sm">POS-এ দেখাবে কিনা</p>
                            </div>
                            <Switch
                                id="is_for_sale"
                                checked={form.data.is_for_sale}
                                onCheckedChange={(checked) => form.setData('is_for_sale', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_active">Active</Label>
                                <p className="text-muted-foreground text-sm">বন্ধ করলে সব জায়গায় লুকানো থাকবে</p>
                            </div>
                            <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked)} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="image">Product Image</Label>
                        {imagePreview && <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-md border object-cover" />}
                        <Input id="image" type="file" accept="image/*" onChange={(e) => onImageChange(e.target.files?.[0] ?? null)} />
                        <InputError message={form.errors.image} />
                    </div>
                </section>

                <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.get(route('products.index'))}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
                    </Button>
                </div>
            </form>

            <LookupManagerModal
                open={lookupModal === 'category'}
                onOpenChange={(open) => !open && setLookupModal(null)}
                title="Manage Categories"
                items={categories}
                storeRouteName="categories.store"
                updateRouteName="categories.update"
                destroyRouteName="categories.destroy"
                parentOptions={categories}
            />

            <LookupManagerModal
                open={lookupModal === 'brand'}
                onOpenChange={(open) => !open && setLookupModal(null)}
                title="Manage Brands"
                items={brands}
                storeRouteName="brands.store"
                updateRouteName="brands.update"
                destroyRouteName="brands.destroy"
            />

            <LookupManagerModal
                open={lookupModal === 'unit'}
                onOpenChange={(open) => !open && setLookupModal(null)}
                title="Manage Units"
                items={units}
                storeRouteName="units.store"
                updateRouteName="units.update"
                destroyRouteName="units.destroy"
            />
        </>
    );
}
