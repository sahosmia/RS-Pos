import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import LookupManagerModal from '@/components/products/lookup-manager-modal';
import MoneyInput from '@/components/shared/money-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/hooks/use-translation';
import { type SharedData } from '@/types';
import { type Brand, type Category, type ProductDetail, type ServicePlanPeriod, type Unit } from '@/types/models';
import { router, useForm, usePage } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface ProductFormProps {
    mode: 'create' | 'edit';
    product?: ProductDetail;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
}

export default function ProductForm({ mode, product, categories, brands, units }: ProductFormProps) {
    const { shop } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null);
    const [lookupModal, setLookupModal] = useState<'category' | 'unit' | 'brand' | null>(null);

    const canSetOpeningStock = product ? product.can_set_opening_stock : true;

    const form = useForm({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        barcode: product?.barcode ?? '',
        category_id: product?.category_id ?? null,
        brand_id: product?.brand_id ?? null,
        unit_id: product?.unit_id ?? 0,
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
        service_plan: product?.service_plan ?? ([] as ServicePlanPeriod[]),
    });

    const addServicePeriod = () => {
        form.setData('service_plan', [...form.data.service_plan, { period_months: 12, free_quota: 0 }]);
    };

    const updateServicePeriod = (index: number, changes: Partial<ServicePlanPeriod>) => {
        form.setData(
            'service_plan',
            form.data.service_plan.map((period, i) => (i === index ? { ...period, ...changes } : period)),
        );
    };

    const removeServicePeriod = (index: number) => {
        form.setData(
            'service_plan',
            form.data.service_plan.filter((_, i) => i !== index),
        );
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            forceFormData: true,
            onSuccess: () => {
                toast.success(mode === 'create' ? t('productForm', 'created_toast') : t('productForm', 'updated_toast'));
                if (mode === 'create') form.reset();
            },
        };

        if (mode === 'edit' && product) {
            // Multipart (image upload) can't be sent as a real PATCH, so POST with a spoofed method Laravel understands.
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
                    <h3 className="font-medium">{t('productForm', 'basic_info')}</h3>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <FormInput
                            id="name"
                            label={t('productForm', 'product_name')}
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            error={form.errors.name}
                            placeholder="e.g. Wireless Mouse, Samsung S23"
                            required
                        />

                        <FormInput
                            id="sku"
                            label={t('productForm', 'sku')}
                            tooltip={t('productForm', 'sku_helper')}
                            value={form.data.sku}
                            onChange={(e) => form.setData('sku', e.target.value)}
                            error={form.errors.sku}
                            placeholder="e.g. SKU-10001"
                        />

                        <div className="grid gap-2">
                            <Label htmlFor="category_id">{t('productForm', 'category')}</Label>
                            <div className="flex gap-2">
                                <SearchableSelect
                                    id="category_id"
                                    className="flex-1"
                                    value={categories.find((category) => category.id === form.data.category_id) ?? null}
                                    onChange={(category) => form.setData('category_id', category?.id ?? null)}
                                    getLabel={(category) => category.name}
                                    options={categories}
                                    placeholder={t('productForm', 'select_category')}
                                    clearable
                                />
                                <Button type="button" variant="outline" size="icon" onClick={() => setLookupModal('category')}>
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            <InputError message={form.errors.category_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="brand_id">{t('productForm', 'brand')}</Label>
                            <div className="flex gap-2">
                                <SearchableSelect
                                    id="brand_id"
                                    className="flex-1"
                                    value={brands.find((brand) => brand.id === form.data.brand_id) ?? null}
                                    onChange={(brand) => form.setData('brand_id', brand?.id ?? null)}
                                    getLabel={(brand) => brand.name}
                                    options={brands}
                                    placeholder={t('productForm', 'no_brand')}
                                    clearable
                                />
                                <Button type="button" variant="outline" size="icon" onClick={() => setLookupModal('brand')}>
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            <InputError message={form.errors.brand_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="unit_id" required>
                                {t('productForm', 'unit')}
                            </Label>
                            <div className="flex gap-2">
                                <Select
                                    value={form.data.unit_id ? String(form.data.unit_id) : ''}
                                    onValueChange={(value) => form.setData('unit_id', Number(value))}
                                >
                                    <SelectTrigger id="unit_id" className="flex-1">
                                        <SelectValue placeholder={t('productForm', 'select_unit')} />
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
                    <h3 className="font-medium">{t('productForm', 'pricing_stock')}</h3>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="selling_price" required>
                                {t('productForm', 'selling_price')}
                            </Label>
                            <MoneyInput
                                id="selling_price"
                                value={form.data.selling_price}
                                onChange={(e) => form.setData('selling_price', Number(e.target.value))}
                                required
                            />
                            <InputError message={form.errors.selling_price} />
                        </div>

                        <FormInput
                            id="minimum_stock_level"
                            label={t('productForm', 'minimum_stock_level')}
                            type="number"
                            step="1"
                            value={form.data.minimum_stock_level}
                            onChange={(e) => form.setData('minimum_stock_level', Number(e.target.value))}
                            error={form.errors.minimum_stock_level}
                            placeholder="0"
                        />

                        {mode === 'edit' && product && (
                            <div className="grid gap-2">
                                <Label>{t('productForm', 'current_stock')}</Label>
                                <p className="text-muted-foreground text-sm">{t('productForm', 'current_stock_locked')}</p>
                                <p className="text-lg font-medium tabular-nums">{product.current_stock}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2 lg:col-span-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="manage_stock">{t('productForm', 'manage_stock')}</Label>
                                <p className="text-muted-foreground text-sm">{t('productForm', 'manage_stock_description')}</p>
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
                                    <FormInput
                                        id="opening_stock"
                                        label={t('productForm', 'opening_stock')}
                                        type="number"
                                        step="1"
                                        value={form.data.opening_stock}
                                        onChange={(e) => form.setData('opening_stock', Number(e.target.value))}
                                        error={form.errors.opening_stock}
                                        placeholder="0"
                                    />

                                    <div className="grid gap-2">
                                        <Label htmlFor="opening_stock_cost">{t('productForm', 'opening_stock_cost')}</Label>
                                        <MoneyInput
                                            id="opening_stock_cost"
                                            value={form.data.opening_stock_cost}
                                            onChange={(e) => form.setData('opening_stock_cost', Number(e.target.value))}
                                        />
                                        <InputError message={form.errors.opening_stock_cost} />
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted-foreground text-sm sm:col-span-2">{t('productForm', 'opening_stock_locked')}</p>
                            ))}
                    </div>
                </section>

                {/* Section 3 — Service & Warranty */}
                <section className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">{t('nav', 'service_warranty')}</h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormInput
                            id="warranty_period_months"
                            label={t('productForm', 'warranty_months')}
                            type="number"
                            min={0}
                            value={form.data.warranty_period_months ?? ''}
                            onChange={(e) => form.setData('warranty_period_months', e.target.value ? Number(e.target.value) : null)}
                            error={form.errors.warranty_period_months}
                            placeholder="e.g. 12"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {(
                            [
                                ['has_installation_service', t('productForm', 'installation_service')],
                                ['emi_available', t('productForm', 'emi_available')],
                                ['track_serial_number', t('productForm', 'track_serial_number')],
                            ] as const
                        )
                            .filter(([key]) => key !== 'emi_available' || shop.emi_module_enabled)
                            .filter(([key]) => key !== 'track_serial_number' || shop.serial_number_module_enabled)
                            .map(([key, label]) => (
                                <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                                    <Label htmlFor={key}>{label}</Label>
                                    <Switch id={key} checked={form.data[key]} onCheckedChange={(checked) => form.setData(key, checked)} />
                                </div>
                            ))}
                    </div>

                    {form.data.has_installation_service && (
                        <div className="space-y-3 rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>{t('productForm', 'service_plan')}</Label>
                                    <p className="text-muted-foreground text-sm">{t('productForm', 'service_plan_description')}</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addServicePeriod}>
                                    <Plus className="mr-1 size-3.5" />
                                    {t('productForm', 'add_period')}
                                </Button>
                            </div>

                            {form.data.service_plan.length === 0 && (
                                <p className="text-muted-foreground text-xs">{t('productForm', 'no_periods_yet')}</p>
                            )}

                            {form.data.service_plan.map((period, index) => (
                                <div key={index} className="flex items-end gap-2">
                                    <div className="grid gap-1">
                                        <Label className="text-xs">
                                            {t('productForm', 'period_label')} {index + 1}
                                        </Label>
                                        <FormInput
                                            id={`service-period-months-${index}`}
                                            label={t('productForm', 'duration_months')}
                                            type="number"
                                            min={1}
                                            className="w-28"
                                            value={period.period_months}
                                            onChange={(e) => updateServicePeriod(index, { period_months: Number(e.target.value) })}
                                            placeholder="12"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <FormInput
                                            id={`service-period-free-quota-${index}`}
                                            label={t('productForm', 'free_quota')}
                                            type="number"
                                            min={0}
                                            className="w-28"
                                            value={period.free_quota}
                                            onChange={(e) => updateServicePeriod(index, { free_quota: Number(e.target.value) })}
                                            placeholder="0"
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeServicePeriod(index)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                            <InputError message={form.errors.service_plan} />
                        </div>
                    )}
                </section>

                {/* Section 4 — Visibility & Media */}
                <section className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">{t('productForm', 'visibility_media')}</h3>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_for_sale">{t('productForm', 'for_sale')}</Label>
                                <p className="text-muted-foreground text-sm">{t('productForm', 'for_sale_description')}</p>
                            </div>
                            <Switch
                                id="is_for_sale"
                                checked={form.data.is_for_sale}
                                onCheckedChange={(checked) => form.setData('is_for_sale', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_active">{t('productForm', 'active')}</Label>
                                <p className="text-muted-foreground text-sm">{t('productForm', 'active_description')}</p>
                            </div>
                            <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked)} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="image">{t('productForm', 'product_image')}</Label>
                        {imagePreview && <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-md border object-cover" />}
                        <Input id="image" type="file" accept="image/*" onChange={(e) => onImageChange(e.target.files?.[0] ?? null)} />
                        <InputError message={form.errors.image} />
                    </div>
                </section>

                <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.get(route('products.index'))}>
                        {t('common', 'cancel')}
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing
                            ? t('common', 'saving')
                            : mode === 'create'
                              ? t('productForm', 'create_product')
                              : t('productForm', 'save_changes')}
                    </Button>
                </div>
            </form>

            <LookupManagerModal
                open={lookupModal === 'category'}
                onOpenChange={(open) => !open && setLookupModal(null)}
                title={t('productForm', 'manage_categories')}
                items={categories}
                storeRouteName="categories.store"
                updateRouteName="categories.update"
                destroyRouteName="categories.destroy"
                parentOptions={categories}
            />

            <LookupManagerModal
                open={lookupModal === 'brand'}
                onOpenChange={(open) => !open && setLookupModal(null)}
                title={t('productForm', 'manage_brands')}
                items={brands}
                storeRouteName="brands.store"
                updateRouteName="brands.update"
                destroyRouteName="brands.destroy"
            />

            <LookupManagerModal
                open={lookupModal === 'unit'}
                onOpenChange={(open) => !open && setLookupModal(null)}
                title={t('productForm', 'manage_units')}
                items={units}
                storeRouteName="units.store"
                updateRouteName="units.update"
                destroyRouteName="units.destroy"
            />
        </>
    );
}
