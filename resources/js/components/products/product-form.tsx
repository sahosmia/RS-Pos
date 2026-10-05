import { BasicInfoSection } from '@/components/products/form/basic-info-section';
import { DesktopActionBar, MobileActionBar } from '@/components/products/form/form-action-bars';
import { LookupModals } from '@/components/products/form/lookup-modals';
import { PricingStockSection } from '@/components/products/form/pricing-stock-section';
import { ServiceWarrantySection } from '@/components/products/form/service-warranty-section';
import { type ProductFormData } from '@/components/products/form/types';
import { useLookupAutoSelect } from '@/components/products/form/use-lookup-auto-select';
import { VisibilityMediaSection } from '@/components/products/form/visibility-media-section';
import { useTranslation } from '@/hooks/use-translation';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { type Brand, type Category, type ProductDetail, type Unit } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEvent, type FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface ProductFormProps {
    mode: 'create' | 'edit';
    product?: ProductDetail;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
}

/**
 * Create / edit a product. This component owns the form state, saving and the shortcuts; each card of the form
 * (basic info, pricing & stock, service & warranty, visibility & media) is its own component under `./form/`.
 */
export default function ProductForm({ mode, product, categories, brands, units }: ProductFormProps) {
    const { t } = useTranslation();

    const form = useForm<ProductFormData>({
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
        image: null,
        service_plan: product?.service_plan ?? [],
    });

    const { bypass, UnsavedChangesModal } = useUnsavedChangesWarning(form.isDirty, form.processing);
    const lookup = useLookupAutoSelect({ form, categories, brands, units });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        bypass();

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

    // ⌘S / Ctrl+S → save
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (!form.processing) submit(e as unknown as FormEvent);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data, form.processing]);

    return (
        <>
            <form onSubmit={submit} className="space-y-5 pb-24 sm:pb-0">
                <BasicInfoSection form={form} categories={categories} brands={brands} units={units} onAddLookup={lookup.open} />
                <PricingStockSection form={form} mode={mode} product={product} canSetOpeningStock={product ? product.can_set_opening_stock : true} />
                <ServiceWarrantySection form={form} />
                <VisibilityMediaSection form={form} savedImageUrl={product?.image_url ?? null} />

                <DesktopActionBar mode={mode} processing={form.processing} />
            </form>

            <MobileActionBar mode={mode} processing={form.processing} onSave={submit} />

            <LookupModals
                active={lookup.active}
                onClose={lookup.close}
                onCreated={lookup.onCreated}
                categories={categories}
                brands={brands}
                units={units}
            />

            <UnsavedChangesModal />
        </>
    );
}
