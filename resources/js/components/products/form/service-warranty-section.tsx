import { FormInput } from '@/components/form/form-input';
import { FormSection } from '@/components/form/form-section';
import { ToggleRow } from '@/components/form/toggle-row';
import { ServicePlanEditor } from '@/components/products/form/service-plan-editor';
import { type ProductFormApi } from '@/components/products/form/types';
import { useTranslation } from '@/hooks/use-translation';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Calendar, ShieldCheck } from 'lucide-react';

/** Warranty length, the installation / EMI / serial-tracking switches, and the service plan when installation is on. */
export function ServiceWarrantySection({ form }: { form: ProductFormApi }) {
    const { shop } = usePage<SharedData>().props;
    const { t } = useTranslation();

    // EMI and serial tracking only appear when the shop has switched those modules on.
    const switches = (
        [
            { key: 'has_installation_service', label: t('productForm', 'installation_service'), enabled: true },
            { key: 'emi_available', label: t('productForm', 'emi_available'), enabled: shop.emi_module_enabled },
            { key: 'track_serial_number', label: t('productForm', 'track_serial_number'), enabled: shop.serial_number_module_enabled },
        ] as const
    ).filter((item) => item.enabled);

    return (
        <FormSection icon={ShieldCheck} title={t('nav', 'service_warranty')} description="Warranty, installation এবং serial tracking" accent="violet">
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
                    icon={Calendar}
                />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {switches.map(({ key, label }) => (
                    <ToggleRow key={key} id={key} label={label} checked={form.data[key]} onCheckedChange={(checked) => form.setData(key, checked)} />
                ))}
            </div>

            {form.data.has_installation_service && <ServicePlanEditor form={form} />}
        </FormSection>
    );
}
