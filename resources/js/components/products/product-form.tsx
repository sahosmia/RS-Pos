import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import LookupManagerModal from '@/components/products/lookup-manager-modal';
import MoneyInput from '@/components/shared/money-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { type Brand, type Category, type ProductDetail, type ServicePlanPeriod, type Unit } from '@/types/models';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    CircleDollarSign,
    Eye,
    ImagePlus,
    Info,
    Package,
    Plus,
    Save,
    Settings2,
    ShieldCheck,
    Sparkles,
    Trash2,
    X,
    type LucideIcon,
} from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ProductFormProps {
    mode: 'create' | 'edit';
    product?: ProductDetail;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
}

/** Section card — same visual language as the Sale form. */
function FormSection({
    icon: Icon,
    title,
    description,
    accent = 'sky',
    children,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    accent?: 'sky' | 'violet' | 'emerald' | 'amber';
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
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b bg-muted/30 px-4 py-3">
                <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg ring-1', chip)}>
                    <Icon className="size-4" />
                </div>
                <div>
                    <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
                    {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
                </div>
            </CardHeader>
            <CardContent className="p-4">{children}</CardContent>
        </Card>
    );
}

/** Toggle row — label + description on the left, switch on the right. */
function ToggleRow({
    id,
    label,
    description,
    checked,
    onCheckedChange,
    icon: Icon,
}: {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    icon?: LucideIcon;
}) {
    return (
        <label
            htmlFor={id}
            className={cn(
                'flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-background p-3 transition-colors',
                checked ? 'border-primary/30 bg-primary/5' : 'hover:bg-muted/40',
            )}
        >
            <div className="flex min-w-0 items-start gap-3">
                {Icon && (
                    <div
                        className={cn(
                            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
                            checked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                        )}
                    >
                        <Icon className="size-3.5" />
                    </div>
                )}
                <div className="min-w-0 space-y-0.5">
                    <div className="text-sm font-medium">{label}</div>
                    {description && <p className="text-muted-foreground text-xs">{description}</p>}
                </div>
            </div>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </label>
    );
}

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px] font-medium">
            {children}
        </kbd>
    );
}

export default function ProductForm({ mode, product, categories, brands, units }: ProductFormProps) {
    const { shop } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null);
    const [lookupModal, setLookupModal] = useState<'category' | 'unit' | 'brand' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        form.setData('service_plan', form.data.service_plan.filter((_, i) => i !== index));
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
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(route('products.update', product.id), options);
        } else {
            form.post(route('products.store'), options);
        }
    };

    /** ⌘S / Ctrl+S → save */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (!form.processing) submit(e as unknown as React.FormEvent);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data, form.processing]);

    const onImageChange = (file: File | null) => {
        form.setData('image', file);
        setImagePreview(file ? URL.createObjectURL(file) : (product?.image_url ?? null));
    };

    const clearImage = () => {
        onImageChange(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <>
            <form onSubmit={submit} className="space-y-5 pb-24 sm:pb-0">
                {/* ───────────── Section 1 — Basic Info ───────────── */}
                <FormSection
                    icon={Package}
                    title={t('productForm', 'basic_info')}
                    description="Name, SKU, category, brand এবং unit"
                    accent="sky"
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <FormInput
                                id="name"
                                label={t('productForm', 'product_name')}
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                error={form.errors.name}
                                placeholder="e.g. Wireless Mouse, Samsung S23"
                                required
                            />
                        </div>

                        <FormInput
                            id="sku"
                            label={t('productForm', 'sku')}
                            tooltip={t('productForm', 'sku_helper')}
                            value={form.data.sku}
                            onChange={(e) => form.setData('sku', e.target.value)}
                            error={form.errors.sku}
                            placeholder="e.g. SKU-10001"
                        />

                        <FormInput
                            id="barcode"
                            label={t('productForm', 'barcode')}
                            value={form.data.barcode}
                            onChange={(e) => form.setData('barcode', e.target.value)}
                            error={form.errors.barcode}
                            placeholder="Scan or type barcode"
                        />

                        {/* Category */}
                        <div className="grid gap-2">
                            <Label htmlFor="category_id">{t('productForm', 'category')}</Label>
                            <div className="flex gap-2">
                                <SearchableSelect
                                    id="category_id"
                                    className="flex-1"
                                    value={categories.find((c) => c.id === form.data.category_id) ?? null}
                                    onChange={(category) => form.setData('category_id', category?.id ?? null)}
                                    getLabel={(c) => c.name}
                                    options={categories}
                                    placeholder={t('productForm', 'select_category')}
                                    clearable
                                />
                                <Button type="button" variant="outline" size="icon" onClick={() => setLookupModal('category')} aria-label="Add category">
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            <InputError message={form.errors.category_id} />
                        </div>

                        {/* Brand */}
                        <div className="grid gap-2">
                            <Label htmlFor="brand_id">{t('productForm', 'brand')}</Label>
                            <div className="flex gap-2">
                                <SearchableSelect
                                    id="brand_id"
                                    className="flex-1"
                                    value={brands.find((b) => b.id === form.data.brand_id) ?? null}
                                    onChange={(brand) => form.setData('brand_id', brand?.id ?? null)}
                                    getLabel={(b) => b.name}
                                    options={brands}
                                    placeholder={t('productForm', 'no_brand')}
                                    clearable
                                />
                                <Button type="button" variant="outline" size="icon" onClick={() => setLookupModal('brand')} aria-label="Add brand">
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            <InputError message={form.errors.brand_id} />
                        </div>

                        {/* Unit */}
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
                                <Button type="button" variant="outline" size="icon" onClick={() => setLookupModal('unit')} aria-label="Add unit">
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            <InputError message={form.errors.unit_id} />
                        </div>
                    </div>
                </FormSection>

                {/* ───────────── Section 2 — Pricing & Stock ───────────── */}
                <FormSection
                    icon={CircleDollarSign}
                    title={t('productForm', 'pricing_stock')}
                    description="Selling price, stock level এবং opening stock"
                    accent="emerald"
                >
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
                            <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
                                <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                    {t('productForm', 'current_stock')}
                                </Label>
                                <p className="text-2xl font-bold tabular-nums leading-none">{product.current_stock}</p>
                                <p className="text-muted-foreground text-xs">{t('productForm', 'current_stock_locked')}</p>
                            </div>
                        )}
                    </div>

                    {/* Manage Stock toggle */}
                    <div className="mt-4">
                        <ToggleRow
                            id="manage_stock"
                            label={t('productForm', 'manage_stock')}
                            description={t('productForm', 'manage_stock_description')}
                            checked={form.data.manage_stock}
                            onCheckedChange={(checked) => form.setData('manage_stock', checked)}
                            icon={Settings2}
                        />
                    </div>

                    {/* Opening stock fields — only when manage_stock is on */}
                    {form.data.manage_stock && (
                        <div className="mt-4 rounded-lg border border-dashed bg-muted/20 p-4">
                            {canSetOpeningStock ? (
                                <div className="grid gap-4 sm:grid-cols-2">
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
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Info className="size-4 shrink-0" />
                                    {t('productForm', 'opening_stock_locked')}
                                </div>
                            )}
                        </div>
                    )}
                </FormSection>

                {/* ───────────── Section 3 — Service & Warranty ───────────── */}
                <FormSection
                    icon={ShieldCheck}
                    title={t('nav', 'service_warranty')}
                    description="Warranty, installation এবং serial tracking"
                    accent="violet"
                >
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

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                                <ToggleRow
                                    key={key}
                                    id={key}
                                    label={label}
                                    checked={form.data[key]}
                                    onCheckedChange={(checked) => form.setData(key, checked)}
                                />
                            ))}
                    </div>

                    {/* Service Plan — only when installation service is on */}
                    {form.data.has_installation_service && (
                        <div className="mt-4 overflow-hidden rounded-lg border">
                            <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="size-4 text-violet-500" />
                                    <div>
                                        <div className="text-sm font-medium">{t('productForm', 'service_plan')}</div>
                                        <p className="text-muted-foreground text-xs">{t('productForm', 'service_plan_description')}</p>
                                    </div>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addServicePeriod} className="gap-1.5">
                                    <Plus className="size-3.5" />
                                    {t('productForm', 'add_period')}
                                </Button>
                            </div>

                            <div className="p-3">
                                {form.data.service_plan.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-6 text-center">
                                        <Sparkles className="size-5 text-muted-foreground" />
                                        <p className="text-muted-foreground text-xs">{t('productForm', 'no_periods_yet')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Header row (desktop only) */}
                                        <div className="hidden grid-cols-[1fr_1fr_auto] gap-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                                            <span>{t('productForm', 'duration_months')}</span>
                                            <span>{t('productForm', 'free_quota')}</span>
                                            <span className="w-9" />
                                        </div>

                                        {form.data.service_plan.map((period, index) => (
                                            <div
                                                key={index}
                                                className="grid grid-cols-1 gap-2 rounded-md border bg-background p-2.5 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-1"
                                            >
                                                <FormInput
                                                    id={`service-period-months-${index}`}
                                                    label={`#${index + 1} · ${t('productForm', 'duration_months')}`}
                                                    type="number"
                                                    min={1}
                                                    value={period.period_months}
                                                    onChange={(e) => updateServicePeriod(index, { period_months: Number(e.target.value) })}
                                                    placeholder="12"
                                                />
                                                <FormInput
                                                    id={`service-period-free-quota-${index}`}
                                                    label={t('productForm', 'free_quota')}
                                                    type="number"
                                                    min={0}
                                                    value={period.free_quota}
                                                    onChange={(e) => updateServicePeriod(index, { free_quota: Number(e.target.value) })}
                                                    placeholder="0"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-9 shrink-0 text-muted-foreground hover:text-destructive sm:mt-6"
                                                    onClick={() => removeServicePeriod(index)}
                                                    aria-label="Remove period"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <InputError message={form.errors.service_plan} />
                            </div>
                        </div>
                    )}
                </FormSection>

                {/* ───────────── Section 4 — Visibility & Media ───────────── */}
                <FormSection
                    icon={Eye}
                    title={t('productForm', 'visibility_media')}
                    description="Product visibility, status এবং image"
                    accent="amber"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ToggleRow
                            id="is_for_sale"
                            label={t('productForm', 'for_sale')}
                            description={t('productForm', 'for_sale_description')}
                            checked={form.data.is_for_sale}
                            onCheckedChange={(checked) => form.setData('is_for_sale', checked)}
                        />
                        <ToggleRow
                            id="is_active"
                            label={t('productForm', 'active')}
                            description={t('productForm', 'active_description')}
                            checked={form.data.is_active}
                            onCheckedChange={(checked) => form.setData('is_active', checked)}
                        />
                    </div>

                    {/* Image uploader */}
                    <div className="mt-4 grid gap-2">
                        <Label htmlFor="image">{t('productForm', 'product_image')}</Label>

                        <input
                            ref={fileInputRef}
                            id="image"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => onImageChange(e.target.files?.[0] ?? null)}
                        />

                        {imagePreview ? (
                            <div className="flex items-start gap-4 rounded-lg border bg-background p-3">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="size-24 shrink-0 rounded-md border object-cover"
                                />
                                <div className="flex flex-1 flex-col gap-2">
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-medium">Current image</div>
                                        <p className="text-muted-foreground text-xs">PNG, JPG — max ~2MB recommended</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="gap-1.5"
                                        >
                                            <ImagePlus className="size-3.5" />
                                            Replace
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearImage}
                                            className="gap-1.5 text-destructive hover:text-destructive"
                                        >
                                            <X className="size-3.5" />
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 py-8 transition-colors hover:border-primary/40 hover:bg-primary/5"
                            >
                                <div className="flex size-11 items-center justify-center rounded-full bg-background ring-1 ring-border">
                                    <ImagePlus className="size-5 text-muted-foreground" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium">Click to upload an image</p>
                                    <p className="text-muted-foreground text-xs">PNG or JPG · up to 2MB</p>
                                </div>
                            </button>
                        )}
                        <InputError message={form.errors.image} />
                    </div>
                </FormSection>

                {/* ───────────── Desktop action bar ───────────── */}
                <div className="hidden items-center justify-between gap-2 border-t pt-4 sm:flex">
                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Kbd>⌘</Kbd>
                        <Kbd>S</Kbd>
                        to save
                    </p>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" onClick={() => router.get(route('products.index'))} className="gap-1.5">
                            <X className="size-4" />
                            {t('common', 'cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing} className="gap-1.5">
                            <Save className="size-4" />
                            {form.processing
                                ? t('common', 'saving')
                                : mode === 'create'
                                  ? t('productForm', 'create_product')
                                  : t('productForm', 'save_changes')}
                        </Button>
                    </div>
                </div>
            </form>

            {/* ───────────── Mobile sticky action bar ───────────── */}
            <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t p-3 shadow-lg backdrop-blur sm:hidden">
                <Button type="button" variant="ghost" onClick={() => router.get(route('products.index'))} className="gap-1.5">
                    <X className="size-4" />
                    {t('common', 'cancel')}
                </Button>
                <Button type="submit" disabled={form.processing} onClick={submit} className="flex-1 gap-1.5">
                    <Save className="size-4" />
                    {form.processing
                        ? t('common', 'saving')
                        : mode === 'create'
                          ? t('productForm', 'create_product')
                          : t('productForm', 'save_changes')}
                </Button>
            </div>

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
