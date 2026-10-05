import { type CartSheetDraft, emptyItem, type SaleFormApi } from '@/components/sales/form/sale-form-utils';
import { type ProductOption } from '@/components/shared/product-search-input';
import { type RecentSale, type SaleFormItem } from '@/types/models';
import { useState } from 'react';

interface Options {
    form: SaleFormApi;
    products: ProductOption[];
}

/**
 * Everything that changes the cart's line items: adding / editing / removing lines, re-adding a recent purchase,
 * the mobile bottom sheet that edits one line, and which line's discount is being edited.
 */
export function useSaleCart({ form, products }: Options) {
    const [cartSheet, setCartSheet] = useState<CartSheetDraft | null>(null);
    const [itemDiscountIndex, setItemDiscountIndex] = useState<number | null>(null);

    const items = form.data.items;
    const productById = (id: number) => products.find((p) => p.id === id);

    const updateItem = (index: number, changes: Partial<SaleFormItem>) => {
        const next = [...items];
        next[index] = { ...next[index], ...changes };
        form.setData('items', next);
    };

    const removeItem = (index: number) => {
        form.setData(
            'items',
            items.filter((_, i) => i !== index),
        );
    };

    /** Adds one of the product, or bumps the quantity if it's already in the cart. */
    const addProduct = (product: ProductOption) => {
        const existingIndex = items.findIndex((i) => i.product_id === product.id);

        if (existingIndex >= 0) {
            updateItem(existingIndex, { quantity: items[existingIndex].quantity + 1 });
        } else {
            form.setData('items', [...items, emptyItem(product)]);
        }
    };

    /** Re-adds everything from a customer's earlier sale, at the price they paid then. */
    const addRecentSale = (recent: RecentSale) => {
        const next = [...items];

        recent.items.forEach((recentItem) => {
            const product = productById(recentItem.product_id);
            if (!product) return;

            const index = next.findIndex((i) => i.product_id === product.id);
            if (index >= 0) {
                next[index] = { ...next[index], quantity: next[index].quantity + recentItem.quantity };
            } else {
                next.push({
                    ...emptyItem(product),
                    quantity: recentItem.quantity,
                    original_price: recentItem.unit_price,
                    unit_price: recentItem.unit_price,
                });
            }
        });

        form.setData('items', next);
    };

    const openSheetForNewProduct = (product: ProductOption) => {
        setCartSheet({
            product,
            index: null,
            quantity: 1,
            originalPrice: product.selling_price,
            unitPrice: product.selling_price,
            discountType: null,
            discountValue: 0,
            installationRequired: false,
            installationCharge: null,
            serialNumbers: [],
        });
    };

    const openSheetForEdit = (index: number) => {
        const item = items[index];
        const product = productById(item.product_id);
        if (!product) return;

        setCartSheet({
            product,
            index,
            quantity: item.quantity,
            originalPrice: item.original_price,
            unitPrice: item.unit_price,
            discountType: item.discount_type,
            discountValue: item.discount_value,
            installationRequired: item.installation_required,
            installationCharge: item.installation_charge,
            serialNumbers: item.serial_numbers,
        });
    };

    /** Commits the sheet's draft: updates the line it came from, or adds it (merging into an existing line). */
    const confirmSheet = () => {
        if (!cartSheet) return;
        const {
            product,
            index,
            quantity,
            originalPrice,
            unitPrice,
            discountType,
            discountValue,
            installationRequired,
            installationCharge,
            serialNumbers,
        } = cartSheet;

        if (index !== null) {
            updateItem(index, {
                quantity,
                original_price: originalPrice,
                unit_price: unitPrice,
                discount_type: discountType,
                discount_value: discountValue,
                installation_required: installationRequired,
                installation_charge: installationCharge,
                serial_numbers: serialNumbers,
            });
        } else {
            const existingIndex = items.findIndex((i) => i.product_id === product.id);

            if (existingIndex >= 0) {
                updateItem(existingIndex, { quantity: items[existingIndex].quantity + quantity });
            } else {
                form.setData('items', [
                    ...items,
                    {
                        product_id: product.id,
                        quantity,
                        original_price: originalPrice,
                        unit_price: unitPrice,
                        discount_type: discountType,
                        discount_value: discountValue,
                        installation_required: installationRequired,
                        installation_charge: installationCharge,
                        note: null,
                        serial_numbers: serialNumbers,
                    },
                ]);
            }
        }

        setCartSheet(null);
    };

    const discountedItem = itemDiscountIndex !== null ? items[itemDiscountIndex] : undefined;

    return {
        productById,
        addProduct,
        addRecentSale,
        updateItem,
        removeItem,
        cartSheet,
        setCartSheet,
        openSheetForNewProduct,
        openSheetForEdit,
        confirmSheet,
        itemDiscountIndex,
        setItemDiscountIndex,
        /** The line whose discount modal is open, if any. */
        discountedItem,
    };
}
