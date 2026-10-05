import { FormInput } from '@/components/form/form-input';
import { FormSection } from '@/components/form/form-section';
import { ReadOnlyField } from '@/components/form/read-only-field';
import { ToggleRow } from '@/components/form/toggle-row';
import { type ProductFormApi } from '@/components/products/form/types';
import MoneyInput from '@/components/shared/money-input';
import { useTranslation } from '@/hooks/use-translation';
import { type ProductDetail } from '@/types/models';
import { CircleDollarSign, Info, Layers, Package, Settings2 } from 'lucide-react';

interface PricingStockSectionProps {
    form: ProductFormApi;
    mode: 'create' | 'edit';
    product?: ProductDetail;
    /** False once the product has stock movements — opening stock can no longer be re-entered. */
    canSetOpeningStock: boolean;
}

/** Selling price, reorder level, the manage-stock switch and (when it's on) the opening stock. */
export function PricingStockSection({ form, mode, product, canSetOpeningStock }: PricingStockSectionProps) {
    const { t } = useTranslation();

    return (
        <FormSection
            icon={CircleDollarSign}
            title={t('productForm', 'pricing_stock')}
            description="Selling price, stock level এবং opening stock"
            accent="emerald"
        >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MoneyInput
                    id="selling_price"
                    label={t('productForm', 'selling_price')}
                    value={form.data.selling_price}
                    onChange={(e) => form.setData('selling_price', Number(e.target.value))}
                    error={form.errors.selling_price}
                />

                <FormInput
                    id="minimum_stock_level"
                    label={t('productForm', 'minimum_stock_level')}
                    type="number"
                    step="1"
                    value={form.data.minimum_stock_level}
                    onChange={(e) => form.setData('minimum_stock_level', Number(e.target.value))}
                    error={form.errors.minimum_stock_level}
                    placeholder="0"
                    icon={Layers}
                />

                {/* Create mode simply has no third field — the row stays a normal grid. */}
                {mode === 'edit' && product && (
                    <ReadOnlyField
                        id="current_stock"
                        label={t('productForm', 'current_stock')}
                        value={product.current_stock}
                        helperText={t('productForm', 'current_stock_locked')}
                    />
                )}
            </div>

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

            {form.data.manage_stock && (
                <div className="bg-muted/20 mt-4 rounded-lg border border-dashed p-4">
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
                                icon={Package}
                            />

                            <MoneyInput
                                id="opening_stock_cost"
                                label={t('productForm', 'opening_stock_cost')}
                                value={form.data.opening_stock_cost}
                                onChange={(e) => form.setData('opening_stock_cost', Number(e.target.value))}
                                error={form.errors.opening_stock_cost}
                            />
                        </div>
                    ) : (
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <Info className="size-4 shrink-0" />
                            {t('productForm', 'opening_stock_locked')}
                        </div>
                    )}
                </div>
            )}
        </FormSection>
    );
}
