import InputError from '@/components/input-error';
import { type SaleFormApi } from '@/components/sales/form/sale-form-utils';
import { SaleItemsList } from '@/components/sales/form/sale-items-list';
import { SaleItemsTable } from '@/components/sales/form/sale-items-table';
import ProductSearchInput, { type ProductOption } from '@/components/shared/product-search-input';
import { useIsMobile } from '@/hooks/use-mobile';
import { type SaleFormItem } from '@/types/models';
import { type Ref } from 'react';

interface ProductLinesSectionProps {
    form: SaleFormApi;
    products: ProductOption[];
    productById: (id: number) => ProductOption | undefined;
    searchRef: Ref<HTMLInputElement>;
    /** Desktop: a picked product goes straight into the cart. */
    onAddProduct: (product: ProductOption) => void;
    /** Mobile: a picked product opens the bottom sheet first, to set quantity / price. */
    onPickProductForSheet: (product: ProductOption) => void;
    onEditLine: (index: number) => void;
    onUpdateLine: (index: number, changes: Partial<SaleFormItem>) => void;
    onRemoveLine: (index: number) => void;
    onEditLineDiscount: (index: number) => void;
}

/** Product search plus the cart — a table on desktop, a card list on mobile. */
export function ProductLinesSection({
    form,
    products,
    productById,
    searchRef,
    onAddProduct,
    onPickProductForSheet,
    onEditLine,
    onUpdateLine,
    onRemoveLine,
    onEditLineDiscount,
}: ProductLinesSectionProps) {
    const isMobile = useIsMobile();
    const items = form.data.items;
    const errors = form.errors as Record<string, string | undefined>;

    return (
        <div>
            <ProductSearchInput ref={searchRef} products={products} onSelect={isMobile ? onPickProductForSheet : onAddProduct} />

            {items.length === 0 && (
                <p className="text-muted-foreground py-8 text-center text-sm">
                    পণ্য খুঁজে যোগ করুন{!isMobile && ' — F2 চেপে সরাসরি search-এ যাওয়া যায়'}
                </p>
            )}

            {items.length > 0 &&
                (isMobile ? (
                    <SaleItemsList items={items} productById={productById} onEdit={onEditLine} onRemove={onRemoveLine} errors={errors} />
                ) : (
                    <SaleItemsTable
                        items={items}
                        productById={productById}
                        onUpdate={onUpdateLine}
                        onRemove={onRemoveLine}
                        onEditDiscount={onEditLineDiscount}
                        errors={errors}
                    />
                ))}

            <InputError message={form.errors.items} />
        </div>
    );
}
