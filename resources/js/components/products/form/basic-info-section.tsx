import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSection } from '@/components/form/form-section';
import { type LookupKind, type ProductFormApi } from '@/components/products/form/types';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { type Brand, type Category, type Unit } from '@/types/models';
import { Barcode, Hash, Package, Plus, Tag } from 'lucide-react';

interface BasicInfoSectionProps {
    form: ProductFormApi;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
    onAddLookup: (kind: LookupKind) => void;
}

/** Name, SKU, barcode and the category / brand / unit pickers (each with a "+" to create one on the spot). */
export function BasicInfoSection({ form, categories, brands, units, onAddLookup }: BasicInfoSectionProps) {
    const { t } = useTranslation();

    return (
        <FormSection icon={Package} title={t('productForm', 'basic_info')} description="Name, SKU, category, brand এবং unit" accent="sky">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <FormInput
                        id="name"
                        label={t('productForm', 'product_name')}
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        error={form.errors.name}
                        placeholder="e.g. Wireless Mouse, Samsung S23"
                        icon={Tag}
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
                    icon={Hash}
                />

                <FormInput
                    id="barcode"
                    label={t('productForm', 'barcode')}
                    value={form.data.barcode}
                    onChange={(e) => form.setData('barcode', e.target.value)}
                    error={form.errors.barcode}
                    placeholder="Scan or type barcode"
                    icon={Barcode}
                />

                <FormField id="category_id" label={t('productForm', 'category')} error={form.errors.category_id}>
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
                        <Button type="button" variant="outline" size="icon" onClick={() => onAddLookup('category')} aria-label="Add category">
                            <Plus className="size-4" />
                        </Button>
                    </div>
                </FormField>

                <FormField id="brand_id" label={t('productForm', 'brand')} error={form.errors.brand_id}>
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
                        <Button type="button" variant="outline" size="icon" onClick={() => onAddLookup('brand')} aria-label="Add brand">
                            <Plus className="size-4" />
                        </Button>
                    </div>
                </FormField>

                <FormField id="unit_id" label={t('productForm', 'unit')} required error={form.errors.unit_id}>
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
                        <Button type="button" variant="outline" size="icon" onClick={() => onAddLookup('unit')} aria-label="Add unit">
                            <Plus className="size-4" />
                        </Button>
                    </div>
                </FormField>
            </div>
        </FormSection>
    );
}
