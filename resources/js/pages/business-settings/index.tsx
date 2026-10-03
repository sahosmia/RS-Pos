
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import MenuOrderEditor, { buildEffectiveMenuOrder } from '@/components/menu-order-editor';
import QuickActionsEditor from '@/components/quick-actions-editor';
import BrandingImageUploader from '@/components/branding-image-uploader';
import ShortcutsDialog from '@/components/shortcuts-dialog';
import ThemeColorPicker from '@/components/theme-color-picker';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';

import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { buildMainNavItems } from '@/lib/nav-items';
import { buildEffectiveQuickActions } from '@/lib/quick-actions';
import { applyThemeColor, type ThemeColorValue } from '@/lib/theme-colors';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Settings } from '@/types/models';

import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';

import {
    Activity,
    ArrowDownUp,
    Check,
    ChevronRight,
    ClipboardList,
    CreditCard,
    LayoutDashboard,
    Palette,
    PanelLeft,
    Settings2,
    ShoppingBag,
    SlidersHorizontal,
    Zap,
} from 'lucide-react';

import { type FormEventHandler, type ReactNode, useState } from 'react';

const PRESET_PER_PAGE_OPTIONS = [
    10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500,
];

const ACTIVITY_LOG_RETENTION_OPTIONS = [3, 6, 12, 18, 24];

const TAB_STORAGE_KEY = 'business-settings-tab';

const TABS = [
    'business',
    'branding',
    'menu-order',
    'quick-actions',
    'invoice',
    'modules',
    'pagination',
    'audit',
];

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Business Settings',
        href: '/business-settings',
    },
];

function readSavedTab(): string {
    try {
        const saved = window.sessionStorage.getItem(TAB_STORAGE_KEY);
        return saved && TABS.includes(saved) ? saved : 'business';
    } catch {
        return 'business';
    }
}

function SectionCard({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string;
    description?: string;
    icon?: typeof Settings2;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-start gap-3 border-b px-4 py-4 sm:px-6">
                {Icon && (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                    </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-sm font-semibold sm:text-base">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
                {children}
            </div>
        </section>
    );
}

function ToggleRow({
    id,
    title,
    description,
    checked,
    onCheckedChange,
}: {
    id: string;
    title: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/30">
            <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
                    {title}
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {description}
                </p>
            </div>

            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
            />
        </div>
    );
}

export default function BusinessSettingsIndex({
    settings,
}: {
    settings: Settings;
}) {
    const { auth } = usePage<SharedData>().props;
    const { t } = useTranslation();

    const allNavItems = buildMainNavItems(
        settings.emi_module_enabled,
        t,
    );

    const {
        data,
        setData,
        patch,
        errors,
        processing,
        recentlySuccessful,
    } = useForm({
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
        menu_order: buildEffectiveMenuOrder(
            allNavItems,
            settings.menu_order,
        ),
        quick_actions: buildEffectiveQuickActions(settings.quick_actions),
    });

    const [newPerPageOption, setNewPerPageOption] = useState('');
    const [tab, setTab] = useState(readSavedTab);

    const changeTab = (next: string) => {
        setTab(next);

        try {
            window.sessionStorage.setItem(TAB_STORAGE_KEY, next);
        } catch {
            // Storage may be unavailable.
        }
    };

    const addPerPageOption = () => {
        const value = Number(newPerPageOption);

        if (
            !value ||
            data.pagination_per_page_options.includes(value)
        ) {
            return;
        }

        setData(
            'pagination_per_page_options',
            [...data.pagination_per_page_options, value].sort(
                (a, b) => a - b,
            ),
        );

        setNewPerPageOption('');
    };

    const removePerPageOption = (value: number) => {
        if (data.pagination_per_page_options.length <= 1) {
            return;
        }

        const remaining = data.pagination_per_page_options.filter(
            (option) => option !== value,
        );

        setData('pagination_per_page_options', remaining);

        if (data.pagination_default_per_page === value) {
            setData('pagination_default_per_page', remaining[0]);
        }
    };

    const availablePerPagePresets = PRESET_PER_PAGE_OPTIONS.filter(
        (option) => !data.pagination_per_page_options.includes(option),
    );

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('business-settings.update'), {
            onSuccess: () => {
                if (auth.user.theme_color === null) {
                    applyThemeColor(data.theme_color);
                }
            },
        });
    };

    const tabItems = [
        {
            value: 'business',
            label: 'Business',
            icon: ShoppingBag,
        },
        {
            value: 'branding',
            label: 'Branding',
            icon: Palette,
        },
        {
            value: 'menu-order',
            label: 'Menu Order',
            icon: ArrowDownUp,
        },
        {
            value: 'quick-actions',
            label: 'Quick Actions',
            icon: Zap,
        },
        {
            value: 'invoice',
            label: 'Invoice',
            icon: CreditCard,
        },
        {
            value: 'modules',
            label: 'Modules',
            icon: SlidersHorizontal,
        },
        {
            value: 'pagination',
            label: 'Pagination',
            icon: LayoutDashboard,
        },
        {
            value: 'audit',
            label: 'Audit Log',
            icon: Activity,
        },
    ];

    const activeTab = tabItems.find((item) => item.value === tab);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Business Settings" />

            <div className="min-h-full bg-muted/20">
                <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">

                    {/* Page Header */}
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Settings2 className="size-6" />
                            </div>

                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                                        Business Settings
                                    </h1>
                                    <Badge variant="secondary" className="text-[10px]">
                                        Admin
                                    </Badge>
                                </div>

                                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                    Manage your shop information, branding,
                                    navigation, invoices and application preferences.
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <ShortcutsDialog />
                        </div>
                    </div>

                    {/* Settings Overview */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <ShoppingBag className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                    Shop
                                </p>
                                <p className="truncate text-sm font-semibold">
                                    {data.shop_name || 'Your Shop'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                <PanelLeft className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                    Configuration
                                </p>
                                <p className="text-sm font-semibold">
                                    {tabItems.length} Settings Sections
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ClipboardList className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                    Configuration status
                                </p>
                                <p className="text-sm font-semibold">
                                    {processing ? 'Saving changes...' : 'Ready to configure'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Form */}
                    <form onSubmit={submit} className="space-y-5">
                        <Tabs
                            value={tab}
                            onValueChange={changeTab}
                            className="w-full"
                        >
                            {/* Responsive Navigation */}
                            <div className="rounded-xl border bg-card p-2 shadow-sm">
                                <div className="mb-2 flex items-center justify-between px-2 pt-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Settings Navigation
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                        {activeTab?.label}
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <TabsList className="flex h-auto min-w-max items-center justify-start gap-1 bg-transparent p-0">
                                        {tabItems.map((item) => {
                                            const Icon = item.icon;

                                            return (
                                                <TabsTrigger
                                                    key={item.value}
                                                    value={item.value}
                                                    className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-transparent px-3 text-xs text-muted-foreground transition-all hover:bg-muted hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary sm:px-4 sm:text-sm"
                                                >
                                                    <Icon className="size-4" />
                                                    {item.label}
                                                </TabsTrigger>
                                            );
                                        })}
                                    </TabsList>
                                </div>
                            </div>

                            {/* BUSINESS */}
                            <TabsContent
                                value="business"
                                className="mt-5 space-y-5 focus-visible:outline-none"
                            >
                                <SectionCard
                                    title="Shop Information"
                                    description="Basic information about your business."
                                    icon={ShoppingBag}
                                >
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                        <div className="md:col-span-2">
                                            <FormInput
                                                id="shop_name"
                                                label="Shop Name"
                                                value={data.shop_name}
                                                onChange={(e) =>
                                                    setData('shop_name', e.target.value)
                                                }
                                                error={errors.shop_name}
                                                placeholder="e.g. My Retail Shop"
                                                required
                                            />
                                        </div>

                                        <FormInput
                                            id="shop_phone"
                                            label="Shop Phone"
                                            value={data.shop_phone}
                                            onChange={(e) =>
                                                setData('shop_phone', e.target.value)
                                            }
                                            error={errors.shop_phone}
                                            placeholder="+8801700000000"
                                        />

                                        <FormInput
                                            id="currency_symbol"
                                            label="Currency Symbol"
                                            value={data.currency_symbol}
                                            onChange={(e) =>
                                                setData('currency_symbol', e.target.value)
                                            }
                                            error={errors.currency_symbol}
                                            placeholder="৳"
                                            required
                                        />

                                        <div className="md:col-span-2">
                                            <FormInput
                                                id="shop_address"
                                                label="Shop Address"
                                                value={data.shop_address}
                                                onChange={(e) =>
                                                    setData('shop_address', e.target.value)
                                                }
                                                error={errors.shop_address}
                                                placeholder="Street, City, Country"
                                            />
                                        </div>
                                    </div>
                                </SectionCard>
                            </TabsContent>

                            {/* BRANDING */}
                            <TabsContent
                                value="branding"
                                className="mt-5 space-y-5 focus-visible:outline-none"
                            >
                                <SectionCard
                                    title="Brand Identity"
                                    description="Manage your shop logo, favicon and application appearance."
                                    icon={Palette}
                                >
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        <BrandingImageUploader
                                            slot="logo"
                                            label="Main Logo"
                                            description="Displayed in the expanded sidebar and login page."
                                            imageUrl={settings.shop_logo_url}
                                            previewClassName="h-20 w-full"
                                        />

                                        <BrandingImageUploader
                                            slot="logo-small"
                                            label="Small Logo"
                                            description="Displayed when the sidebar is collapsed."
                                            imageUrl={settings.shop_logo_small_url}
                                            previewClassName="size-20"
                                        />

                                        <BrandingImageUploader
                                            slot="favicon"
                                            label="Favicon"
                                            description="The icon displayed in your browser tab."
                                            imageUrl={settings.favicon_url}
                                            accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/webp,image/jpeg,.ico"
                                            previewClassName="size-20"
                                        />
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    title="Default Accent Color"
                                    description="Choose the default color used throughout your application. Personal user preferences take priority."
                                    icon={Palette}
                                >
                                    <ThemeColorPicker
                                        value={data.theme_color}
                                        onChange={(color) =>
                                            setData('theme_color', color)
                                        }
                                    />
                                    <InputError message={errors.theme_color} />
                                </SectionCard>
                            </TabsContent>

                            {/* MENU ORDER */}
                            <TabsContent
                                value="menu-order"
                                className="mt-5 space-y-5 focus-visible:outline-none"
                            >
                                <SectionCard
                                    title="Sidebar Menu Organizer"
                                    description="Arrange the navigation menu order for all users. Hidden items will remain hidden according to permissions."
                                    icon={ArrowDownUp}
                                >
                                    <MenuOrderEditor
                                        navItems={allNavItems}
                                        order={data.menu_order}
                                        onChange={(order) =>
                                            setData('menu_order', order)
                                        }
                                    />
                                </SectionCard>
                            </TabsContent>

                            {/* QUICK ACTIONS */}
                            <TabsContent
                                value="quick-actions"
                                className="mt-5 space-y-5 focus-visible:outline-none"
                            >
                                <SectionCard
                                    title="Quick Actions"
                                    description="Configure the actions available through Ctrl + Space."
                                    icon={Zap}
                                >
                                    <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            Press <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-xs">Ctrl</kbd>
                                            {' + '}
                                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-xs">Space</kbd>
                                            {' '}to open the quick actions menu. Hold Ctrl and press Space again to navigate through actions.
                                        </p>
                                    </div>

                                    <QuickActionsEditor
                                        value={data.quick_actions}
                                        onChange={(value) =>
                                            setData('quick_actions', value)
                                        }
                                    />
                                </SectionCard>
                            </TabsContent>

                            {/* INVOICE */}
                            <TabsContent
                                value="invoice"
                                className="mt-5 space-y-5 focus-visible:outline-none"
                            >
                                <SectionCard
                                    title="Invoice Numbering"
                                    description="Manage invoice and purchase numbering formats."
                                    icon={CreditCard}
                                >
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                        <FormInput
                                            id="invoice_prefix"
                                            label="Invoice Prefix"
                                            value={data.invoice_prefix}
                                            onChange={(e) =>
                                                setData('invoice_prefix', e.target.value)
                                            }
                                            error={errors.invoice_prefix}
                                            placeholder="INV-"
                                            required
                                        />

                                        <FormInput
                                            id="invoice_next_number"
                                            label="Next Invoice Number"
                                            type="number"
                                            min={1}
                                            value={data.invoice_next_number}
                                            onChange={(e) =>
                                                setData(
                                                    'invoice_next_number',
                                                    Number(e.target.value),
                                                )
                                            }
                                            error={errors.invoice_next_number}
                                            placeholder="1001"
                                            required
                                        />
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="mb-2 text-xs text-muted-foreground">
                                            Invoice preview
                                        </p>
                                        <p className="font-mono text-lg font-semibold tracking-wide">
                                            {data.invoice_prefix}
                                            {data.invoice_next_number}
                                        </p>
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    title="Purchase Numbering"
                                    description="Configure the prefix and next number for purchase records."
                                    icon={ShoppingBag}
                                >
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                        <FormInput
                                            id="purchase_prefix"
                                            label="Purchase Prefix"
                                            value={data.purchase_prefix}
                                            onChange={(e) =>
                                                setData('purchase_prefix', e.target.value)
                                            }
                                            error={errors.purchase_prefix}
                                            placeholder="PUR-"
                                            required
                                        />

                                        <FormInput
                                            id="purchase_next_number"
                                            label="Next Purchase Number"
                                            type="number"
                                            min={1}
                                            value={data.purchase_next_number}
                                            onChange={(e) =>
                                                setData(
                                                    'purchase_next_number',
                                                    Number(e.target.value),
                                                )
                                            }
                                            error={errors.purchase_next_number}
                                            placeholder="1001"
                                            required
                                        />
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="mb-2 text-xs text-muted-foreground">
                                            Purchase preview
                                        </p>
                                        <p className="font-mono text-lg font-semibold tracking-wide">
                                            {data.purchase_prefix}
                                            {data.purchase_next_number}
                                        </p>
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    title="Fiscal Year"
                                    description="Set the starting month for your fiscal year."
                                    icon={Activity}
                                >
                                    <div className="max-w-sm">
                                        <FormInput
                                            id="fiscal_year_start_month"
                                            label="Fiscal Year Start Month (1-12)"
                                            type="number"
                                            min={1}
                                            max={12}
                                            value={data.fiscal_year_start_month}
                                            onChange={(e) =>
                                                setData(
                                                    'fiscal_year_start_month',
                                                    Number(e.target.value),
                                                )
                                            }
                                            error={errors.fiscal_year_start_month}
                                            placeholder="1"
                                            required
                                        />
                                    </div>
                                </SectionCard>
                            </TabsContent>

                            {/* MODULES */}
                            <TabsContent
                                value="modules"
                                className="mt-5 space-y-5 focus-visible:outline-none"
                            >
                                <SectionCard
                                    title="Application Modules"
                                    description="Enable or disable optional features in your application."
                                    icon={SlidersHorizontal}
                                >
                                    <div className="space-y-3">
                                        <ToggleRow
                                            id="thermal_printer_enabled"
                                            title="Thermal Printer"
                                            description="Use the thermal printer layout for invoices and challans."
                                            checked={data.thermal_printer_enabled}
                                            onCheckedChange={(checked) =>
                                                setData('thermal_printer_enabled', checked)
                                            }
                                        />

                                        <ToggleRow
                                            id="emi_module_enabled"
                                            title="EMI Module"
                                            description="Enable EMI and installment-related features throughout the application."
                                            checked={data.emi_module_enabled}
                                            onCheckedChange={(checked) =>
                                                setData('emi_module_enabled', checked)
                                            }
                                        />

                                        <ToggleRow
                                            id="serial_number_module_enabled"
                                            title="Serial Number Tracking"
                                            description="Enable serial number inputs in the sales form."
                                            checked={data.serial_number_module_enabled}
                                            onCheckedChange={(checked) =>
                                                setData(
                                                    'serial_number_module_enabled',
                                                    checked,
                                                )
                                            }
                                        />
                                    </div>
                                </SectionCard>
                            </TabsContent>

                            {/* PAGINATION */}
                            <TabsContent
                                value="pagination"
                                className="mt-5 space-y-5 focus-visible:outline-none"
                            >
                                <SectionCard
                                    title="Pagination Preferences"
                                    description="Configure the number of rows displayed in tables throughout the application."
                                    icon={LayoutDashboard}
                                >
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label>Rows-per-page options</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Choose which page-size options are available in table dropdowns.
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {data.pagination_per_page_options.map(
                                                (option) => (
                                                    <Badge
                                                        key={option}
                                                        variant="secondary"
                                                        className="gap-1 py-1.5 pr-1 pl-3 text-sm"
                                                    >
                                                        {option}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removePerPageOption(option)
                                                            }
                                                            disabled={
                                                                data.pagination_per_page_options.length <= 1
                                                            }
                                                            className="ml-1 rounded-full p-1 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                                                            aria-label={`Remove ${option}`}
                                                        >
                                                            <span className="text-xs">×</span>
                                                        </button>
                                                    </Badge>
                                                ),
                                            )}
                                        </div>

                                        <InputError
                                            message={errors.pagination_per_page_options}
                                        />

                                        <div className="flex flex-wrap items-end gap-2 pt-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="new_pagination_option">
                                                    Add an option
                                                </Label>

                                                <Select
                                                    value={newPerPageOption}
                                                    onValueChange={setNewPerPageOption}
                                                >
                                                    <SelectTrigger
                                                        id="new_pagination_option"
                                                        className="w-40"
                                                    >
                                                        <SelectValue placeholder="Select rows" />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        {availablePerPagePresets.map(
                                                            (option) => (
                                                                <SelectItem
                                                                    key={option}
                                                                    value={String(option)}
                                                                >
                                                                    {option} rows
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={addPerPageOption}
                                                disabled={!newPerPageOption}
                                                className="gap-2"
                                            >
                                                <span className="text-lg leading-none">+</span>
                                                Add Option
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="max-w-sm space-y-2">
                                        <FormSelect
                                            id="pagination_default_per_page"
                                            label="Default Rows Per Page"
                                            value={data.pagination_default_per_page}
                                            onChange={(val) =>
                                                val &&
                                                setData(
                                                    'pagination_default_per_page',
                                                    Number(val),
                                                )
                                            }
                                            options={data.pagination_per_page_options.map(
                                                (option) => ({
                                                    value: String(option),
                                                    label: `${option} rows`,
                                                }),
                                            )}
                                            error={errors.pagination_default_per_page}
                                            required
                                        />
                                    </div>

                                    <ToggleRow
                                        id="pagination_allow_all"
                                        title='Allow "Show All"'
                                        description="Allow users to display all rows at once in large tables."
                                        checked={data.pagination_allow_all}
                                        onCheckedChange={(checked) =>
                                            setData('pagination_allow_all', checked)
                                        }
                                    />
                                </SectionCard>
                            </TabsContent>

                            {/* AUDIT LOG */}
                            <TabsContent
                                value="audit"
                                className="mt-5 space-y-5 focus-visible:outline-none"
                            >
                                <SectionCard
                                    title="Activity Log Retention"
                                    description="Choose how long audit log records are retained before automatic cleanup."
                                    icon={Activity}
                                >
                                    <div className="max-w-sm space-y-3">
                                        <FormSelect
                                            id="activity_log_retention_months"
                                            label="Retention Period"
                                            value={data.activity_log_retention_months}
                                            onChange={(val) =>
                                                val &&
                                                setData(
                                                    'activity_log_retention_months',
                                                    Number(val),
                                                )
                                            }
                                            options={ACTIVITY_LOG_RETENTION_OPTIONS.map(
                                                (option) => ({
                                                    value: String(option),
                                                    label: `${option} months`,
                                                }),
                                            )}
                                            error={errors.activity_log_retention_months}
                                            required
                                        />
                                    </div>

                                    <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                                        <Activity className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                                Automatic log cleanup
                                            </p>
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                Records older than the selected retention period will be removed automatically according to your application's scheduled cleanup process.
                                            </p>
                                        </div>
                                    </div>
                                </SectionCard>
                            </TabsContent>
                        </Tabs>

                        {/* Save Footer */}
                        <div className="sticky bottom-2 z-10 flex flex-col gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                            <div className="flex min-w-0 items-center gap-2">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                    {recentlySuccessful ? (
                                        <Check className="size-4 text-emerald-600" />
                                    ) : (
                                        <Settings2 className="size-4 text-muted-foreground" />
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        {recentlySuccessful
                                            ? 'Changes saved successfully'
                                            : 'Remember to save your changes'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {processing
                                            ? 'Saving settings...'
                                            : 'Your settings will be applied after saving.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out duration-300"
                                    enterFrom="opacity-0"
                                    enterTo="opacity-100"
                                    leave="transition ease-in-out duration-300"
                                    leaveFrom="opacity-100"
                                    leaveTo="opacity-0"
                                >
                                    <Badge
                                        variant="secondary"
                                        className="gap-1.5 text-emerald-600 dark:text-emerald-400"
                                    >
                                        <Check className="size-3.5" />
                                        Saved
                                    </Badge>
                                </Transition>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="min-w-28 gap-2"
                                >
                                    {processing ? (
                                        <>
                                            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Saving
                                        </>
                                    ) : (
                                        <>
                                            Save Changes
                                            <ChevronRight className="size-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}

