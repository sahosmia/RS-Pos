import { AuditTab } from '@/components/business-settings/audit-tab';
import { BrandingTab } from '@/components/business-settings/branding-tab';
import { ModulesTab } from '@/components/business-settings/modules-tab';
import { MenuOrderTab, QuickActionsTab } from '@/components/business-settings/navigation-tabs';
import { NumberingTab } from '@/components/business-settings/numbering-tab';
import { PaginationTab } from '@/components/business-settings/pagination-tab';
import { SaveFooter } from '@/components/business-settings/save-footer';
import { SettingsHeader } from '@/components/business-settings/settings-header';
import { SettingsTabNav } from '@/components/business-settings/settings-tab-nav';
import { ShopTab } from '@/components/business-settings/shop-tab';
import { SETTINGS_TABS, useSavedTab } from '@/components/business-settings/tab-definitions';
import { type BusinessSettingsData } from '@/components/business-settings/types';
import { buildEffectiveMenuOrder } from '@/components/menu-order-editor';
import { Tabs } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { buildMainNavItems } from '@/lib/nav-items';
import { buildEffectiveQuickActions } from '@/lib/quick-actions';
import { applyThemeColor, type ThemeColorValue } from '@/lib/theme-colors';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Settings } from '@/types/models';
import { Head, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Business Settings', href: '/business-settings' }];

/**
 * Admin settings for the whole shop. One form, one Save button; each tab (shop, branding, menu order, quick actions,
 * numbering, modules, pagination, audit log) is its own component under `components/business-settings/`.
 */
export default function BusinessSettingsIndex({ settings }: { settings: Settings }) {
    const { auth } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const [tab, changeTab] = useSavedTab();

    const navItems = buildMainNavItems(settings.emi_module_enabled, t);

    const form = useForm<BusinessSettingsData>({
        shop_name: settings.shop_name,
        shop_address: settings.shop_address ?? '',
        shop_phone: settings.shop_phone ?? '',
        currency_symbol: settings.currency_symbol,
        invoice_prefix: settings.invoice_prefix,
        invoice_next_number: settings.invoice_next_number,
        purchase_prefix: settings.purchase_prefix,
        purchase_next_number: settings.purchase_next_number,
        fiscal_year_start_month: settings.fiscal_year_start_month,
        thermal_printer_enabled: settings.thermal_printer_enabled,
        emi_module_enabled: settings.emi_module_enabled,
        serial_number_module_enabled: settings.serial_number_module_enabled,
        pagination_per_page_options: settings.pagination_per_page_options,
        pagination_default_per_page: settings.pagination_default_per_page,
        pagination_allow_all: settings.pagination_allow_all,
        activity_log_retention_months: settings.activity_log_retention_months,
        theme_color: settings.theme_color as ThemeColorValue,
        menu_order: buildEffectiveMenuOrder(navItems, settings.menu_order),
        quick_actions: buildEffectiveQuickActions(settings.quick_actions),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.patch(route('business-settings.update'), {
            onSuccess: () => {
                // people who haven't picked their own accent colour follow the shop's
                if (auth.user.theme_color === null) {
                    applyThemeColor(form.data.theme_color);
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Business Settings" />

            <div className="bg-muted/20 min-h-full">
                <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
                    <SettingsHeader shopName={form.data.shop_name} sectionCount={SETTINGS_TABS.length} processing={form.processing} />

                    <form onSubmit={submit} className="space-y-5">
                        <Tabs value={tab} onValueChange={changeTab} className="w-full">
                            <SettingsTabNav activeTab={tab} />

                            <ShopTab form={form} />
                            <BrandingTab form={form} settings={settings} />
                            <MenuOrderTab form={form} navItems={navItems} />
                            <QuickActionsTab form={form} />
                            <NumberingTab form={form} />
                            <ModulesTab form={form} />
                            <PaginationTab form={form} />
                            <AuditTab form={form} />
                        </Tabs>

                        <SaveFooter processing={form.processing} recentlySuccessful={form.recentlySuccessful} />
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
