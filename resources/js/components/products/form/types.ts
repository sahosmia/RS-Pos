import { type ServicePlanPeriod } from '@/types/models';
import { type InertiaFormProps } from '@inertiajs/react';

/** Everything the product form submits. */
export type ProductFormData = {
    name: string;
    sku: string;
    barcode: string;
    category_id: number | null;
    brand_id: number | null;
    unit_id: number;
    selling_price: number;
    minimum_stock_level: number;
    manage_stock: boolean;
    opening_stock: number;
    opening_stock_cost: number;
    warranty_period_months: number | null;
    has_installation_service: boolean;
    emi_available: boolean;
    track_serial_number: boolean;
    is_for_sale: boolean;
    is_active: boolean;
    image: File | null;
    service_plan: ServicePlanPeriod[];
};

/** The Inertia form instance each section reads from and writes to. */
export type ProductFormApi = InertiaFormProps<ProductFormData>;

/** The lookup lists that can be extended from inside the product form. */
export type LookupKind = 'category' | 'brand' | 'unit';
