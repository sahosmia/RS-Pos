import { BrandingTab } from '@/components/invoice-settings/branding-tab';
import { GeneralTab } from '@/components/invoice-settings/general-tab';
import { InvoiceSettingsHeader } from '@/components/invoice-settings/invoice-settings-header';
import { InvoiceTabNav } from '@/components/invoice-settings/invoice-tab-nav';
import { LivePreviewPanel } from '@/components/invoice-settings/live-preview-panel';
import { SavePanel } from '@/components/invoice-settings/save-panel';
import { FooterTab, TermsTab } from '@/components/invoice-settings/terms-footer-tabs';
import { BusinessTab, CustomerTab, ItemsTab, TotalsTab } from '@/components/invoice-settings/toggle-tabs';
import { type InvoiceSettingsData, type UpdateSection } from '@/components/invoice-settings/types';
import { Tabs } from '@/components/ui/tabs';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type InvoiceSettingsConfig, type InvoiceShopInfo } from '@/types/models';
import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Invoice Settings', href: '/invoice-settings' }];

interface InvoiceSettingsProps {
    settings: InvoiceSettingsConfig;
    logoUrl: string | null;
    shop: InvoiceShopInfo;
}

/**
 * Configure how invoices print. One form with a live preview beside it; each tab (general, branding, business,
 * customer, items, totals, terms, footer) is its own component under `components/invoice-settings/`.
 */
export default function InvoiceSettingsIndex({ settings, logoUrl, shop }: InvoiceSettingsProps) {
    const form = useForm<InvoiceSettingsData>({ ...settings, logo: null });
    const { data, setData, isDirty, processing, recentlySuccessful } = form;

    const { UnsavedChangesModal } = useUnsavedChangesWarning(isDirty, processing);

    const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const updateSection: UpdateSection = (section, patch) => {
        // `setData` can't relate a generic section key to its value type, so narrow it by hand
        const setSection = setData as (key: typeof section, value: InvoiceSettingsConfig[typeof section]) => void;

        setSection(section, { ...data[section], ...patch });
    };

    const changeLogo = (file: File | null) => {
        setData('logo', file);
        setLogoPreview(file ? URL.createObjectURL(file) : logoUrl);
    };

    const clearLogo = () => {
        setData('logo', null);
        setLogoPreview(null);

        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((formData) => ({ ...formData, _method: 'patch' }));

        form.post(route('invoice-settings.update'), {
            forceFormData: true,
            onSuccess: () => form.setDefaults(), // saved: the form now matches the server, so nothing is unsaved
        });
    };

    const tabProps = { form, updateSection };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Invoice Settings" />

            <div className="bg-muted/20 min-h-full">
                <div className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
                    <InvoiceSettingsHeader data={data} processing={processing} isDirty={isDirty} recentlySuccessful={recentlySuccessful} />

                    <form onSubmit={submit}>
                        <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] 2xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
                            <div className="min-w-0 space-y-5">
                                <Tabs defaultValue="general" className="w-full">
                                    <InvoiceTabNav />

                                    <GeneralTab {...tabProps} />
                                    <BrandingTab
                                        {...tabProps}
                                        logoPreview={logoPreview}
                                        inputRef={logoInputRef}
                                        onLogoChange={changeLogo}
                                        onLogoClear={clearLogo}
                                    />
                                    <BusinessTab {...tabProps} />
                                    <CustomerTab {...tabProps} />
                                    <ItemsTab {...tabProps} />
                                    <TotalsTab {...tabProps} />
                                    <TermsTab {...tabProps} />
                                    <FooterTab {...tabProps} />
                                </Tabs>

                                <SavePanel processing={processing} recentlySuccessful={recentlySuccessful} />
                            </div>

                            <LivePreviewPanel settings={data} logoPreview={logoPreview} shop={shop} />
                        </div>
                    </form>
                </div>
            </div>

            <UnsavedChangesModal />
        </AppLayout>
    );
}
