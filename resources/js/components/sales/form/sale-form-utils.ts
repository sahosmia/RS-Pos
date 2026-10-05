import { discountAmountFor, type DiscountTypeValue } from '@/components/sales/discount-modal';
import { type ProductOption } from '@/components/shared/product-search-input';
import { type SaleFormItem } from '@/types/models';
import { type InertiaFormProps } from '@inertiajs/react';

/** Everything the sale form submits (the save handler adds `status`, `source` and `payments`). */
export type SaleFormData = {
    customer_id: number;
    sale_date: string;
    discount_type: DiscountTypeValue;
    discount_value: number;
    valid_until: string;
    financing_type: 'one_time' | 'emi';
    installment_count: number | null;
    items: SaleFormItem[];
};

export type SaleFormApi = InertiaFormProps<SaleFormData>;

export type SaleStatus = 'draft' | 'quotation' | 'confirmed';

/** A line being added or edited in the mobile bottom sheet, before it is committed to the cart. */
export interface CartSheetDraft {
    product: ProductOption;
    /** Index of the cart line being edited, or null when adding a new product. */
    index: number | null;
    quantity: number;
    originalPrice: number;
    unitPrice: number;
    discountType: DiscountTypeValue;
    discountValue: number;
    installationRequired: boolean;
    installationCharge: number | null;
    serialNumbers: string[];
}

export const round2 = (value: number) => Math.round(value * 100) / 100;

/** The unit shown next to a quantity ("pcs" when the product has none). */
export const unitLabel = (product?: ProductOption) => product?.unit?.short_name || product?.unit?.name || 'pcs';

export const emptyItem = (product: ProductOption): SaleFormItem => ({
    product_id: product.id,
    quantity: 1,
    original_price: product.selling_price,
    unit_price: product.selling_price,
    discount_type: null,
    discount_value: 0,
    installation_required: false,
    installation_charge: null,
    note: null,
    serial_numbers: [],
});

/** The cart a new sale starts with: just the product picked from the product list, if it can be sold. */
export const startingItems = (products: ProductOption[], productId?: number | null): SaleFormItem[] => {
    const product = productId ? products.find((p) => p.id === productId) : undefined;

    return product ? [emptyItem(product)] : [];
};

/**
 * The cart's money figures: line subtotal, invoice-level discount, installation charges and what's left to pay.
 * Installation is billed on top of the goods and never discounted — same as the backend's SaleTotals.
 */
export function saleTotals(items: SaleFormItem[], discountType: DiscountTypeValue, discountValue: number) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const discountAmount = discountAmountFor(subtotal, discountType, discountValue);
    const installation = items.reduce((sum, item) => sum + (item.installation_required ? (item.installation_charge ?? 0) : 0), 0);

    return { subtotal, discountAmount, installation, total: subtotal - discountAmount + installation };
}
