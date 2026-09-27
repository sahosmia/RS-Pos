import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import MenuOrderEditor, { buildEffectiveMenuOrder } from '@/components/menu-order-editor';
import ShortcutsDialog from '@/components/shortcuts-dialog';
import ThemeColorPicker from '@/components/theme-color-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { buildMainNavItems } from '@/lib/nav-items';
import { applyThemeColor, type ThemeColorValue } from '@/lib/theme-colors';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Settings } from '@/types/models';
import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

const PRESET_PER_PAGE_OPTIONS = [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500];
const ACTIVITY_LOG_RETENTION_OPTIONS = [3, 6, 12, 18];

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Business Settings',
        href: '/business-settings',
    },
];

export default function BusinessSettingsIndex({ settings }: { settings: Settings }) {
    const { auth } = usePage<SharedData>().props;
    const { t } = useTranslation();

    // Unfiltered by permission — an admin reorders the menu for everyone, not just for what they themselves can see.
    const allNavItems = buildMainNavItems(settings.emi_module_enabled, t);

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
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
        menu_order: buildEffectiveMenuOrder(allNavItems, settings.menu_order),
    });

    const [newPerPageOption, setNewPerPageOption] = useState('');

    const addPerPageOption = () => {
        const value = Number(newPerPageOption);
        if (!value || data.pagination_per_page_options.includes(value)) {
            return;
        }

        setData(
            'pagination_per_page_options',
            [...data.pagination_per_page_options, value].sort((a, b) => a - b),
        );
        setNewPerPageOption('');
    };

    const removePerPageOption = (value: number) => {
        if (data.pagination_per_page_options.length <= 1) {
            return;
        }

        const remaining = data.pagination_per_page_options.filter((option) => option !== value);
        setData('pagination_per_page_options', remaining);

        if (data.pagination_default_per_page === value) {
            setData('pagination_default_per_page', remaining[0]);
        }
    };

    const availablePerPagePresets = PRESET_PER_PAGE_OPTIONS.filter((option) => !data.pagination_per_page_options.includes(option));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('business-settings.update'), {
            onSuccess: () => {
                // Only the current user's *effective* palette needs a live update — skip it
                // if they have their own personal override (it takes priority regardless).
                if (auth.user.theme_color === null) {
                    applyThemeColor(data.theme_color);
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Business Settings" />

            <div className="px-4 py-6">
                <HeadingSmall title="Business Settings" description="Shop info, invoice numbering ও optional module toggle" />

                <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label>Keyboard Shortcuts</Label>
                        <p className="text-muted-foreground text-sm">অ্যাপের সব keyboard shortcut এক জায়গায় দেখে নিন</p>
                    </div>
                    <ShortcutsDialog />
                </div>

                <form onSubmit={submit} className="mt-6 space-y-6">
                    <Tabs defaultValue="business" className="w-full">
                        <TabsList>
                            <TabsTrigger value="business">Business</TabsTrigger>
                            <TabsTrigger value="branding">Branding</TabsTrigger>
                            <TabsTrigger value="menu-order">Menu Order</TabsTrigger>
                            <TabsTrigger value="invoice">Invoice</TabsTrigger>
                            <TabsTrigger value="modules">Modules</TabsTrigger>
                            <TabsTrigger value="pagination">Pagination</TabsTrigger>
                            <TabsTrigger value="audit">Audit Log</TabsTrigger>
                        </TabsList>

                        <TabsContent value="business" className="space-y-6">
                            <FormInput
                                id="shop_name"
                                label="Shop Name"
                                value={data.shop_name}
                                onChange={(e) => setData('shop_name', e.target.value)}
                                error={errors.shop_name}
                                placeholder="e.g. My Retail Shop"
                                required
                            />

                            <FormInput
                                id="shop_address"
                                label="Shop Address"
                                value={data.shop_address}
                                onChange={(e) => setData('shop_address', e.target.value)}
                                error={errors.shop_address}
                                placeholder="e.g. 123 Main St, City"
                            />

                            <FormInput
                                id="shop_phone"
                                label="Shop Phone"
                                value={data.shop_phone}
                                onChange={(e) => setData('shop_phone', e.target.value)}
                                error={errors.shop_phone}
                                placeholder="e.g. +8801700000000"
                            />

                            <FormInput
                                id="currency_symbol"
                                label="Currency Symbol"
                                className="max-w-24"
                                value={data.currency_symbol}
                                onChange={(e) => setData('currency_symbol', e.target.value)}
                                error={errors.currency_symbol}
                                placeholder="৳"
                                required
                            />
                        </TabsContent>

                        <TabsContent value="branding" className="space-y-6">
                            <div className="grid gap-2">
                                <Label>Default accent color</Label>
                                <p className="text-muted-foreground text-sm">
                                    পুরো অ্যাপের default color — কোনো user নিজের জন্য আলাদা color বেছে নিলে সেটাই তার জন্য priority পাবে (Settings →
                                    Appearance)
                                </p>
                                <ThemeColorPicker value={data.theme_color} onChange={(color) => setData('theme_color', color)} />
                                <InputError message={errors.theme_color} />
                            </div>
                        </TabsContent>

                        <TabsContent value="menu-order" className="space-y-6">
                            <div className="grid gap-2">
                                <Label>Sidebar menu order</Label>
                                <p className="text-muted-foreground text-sm">
                                    Up/Down দিয়ে menu-র ক্রম সাজান — প্রতিটা user-এর sidebar-এ এই order-ই দেখাবে (permission অনুযায়ী hidden menu
                                    থাকলে সেটা বাদ দিয়ে বাকিগুলো একই order-এ দেখাবে)
                                </p>
                                <MenuOrderEditor navItems={allNavItems} order={data.menu_order} onChange={(order) => setData('menu_order', order)} />
                            </div>
                        </TabsContent>

                        <TabsContent value="invoice" className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput
                                    id="invoice_prefix"
                                    label="Invoice Prefix"
                                    value={data.invoice_prefix}
                                    onChange={(e) => setData('invoice_prefix', e.target.value)}
                                    error={errors.invoice_prefix}
                                    placeholder="e.g. INV-"
                                    required
                                />

                                <FormInput
                                    id="invoice_next_number"
                                    label="Next Invoice Number"
                                    type="number"
                                    min={1}
                                    value={data.invoice_next_number}
                                    onChange={(e) => setData('invoice_next_number', Number(e.target.value))}
                                    error={errors.invoice_next_number}
                                    placeholder="1001"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormInput
                                    id="purchase_prefix"
                                    label="Purchase Prefix"
                                    value={data.purchase_prefix}
                                    onChange={(e) => setData('purchase_prefix', e.target.value)}
                                    error={errors.purchase_prefix}
                                    placeholder="e.g. PUR-"
                                    required
                                />

                                <FormInput
                                    id="purchase_next_number"
                                    label="Next Purchase Number"
                                    type="number"
                                    min={1}
                                    value={data.purchase_next_number}
                                    onChange={(e) => setData('purchase_next_number', Number(e.target.value))}
                                    error={errors.purchase_next_number}
                                    placeholder="1001"
                                    required
                                />
                            </div>

                            <FormInput
                                id="fiscal_year_start_month"
                                label="Fiscal Year Start Month (1-12)"
                                type="number"
                                min={1}
                                max={12}
                                className="max-w-24"
                                value={data.fiscal_year_start_month}
                                onChange={(e) => setData('fiscal_year_start_month', Number(e.target.value))}
                                error={errors.fiscal_year_start_month}
                                placeholder="1"
                                required
                            />
                        </TabsContent>

                        <TabsContent value="modules" className="space-y-6">
                            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="thermal_printer_enabled">Thermal Printer</Label>
                                    <p className="text-muted-foreground text-sm">Invoice/challan-এ thermal printer layout দেখাবে</p>
                                </div>
                                <Switch
                                    id="thermal_printer_enabled"
                                    checked={data.thermal_printer_enabled}
                                    onCheckedChange={(checked) => setData('thermal_printer_enabled', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="emi_module_enabled">EMI Module</Label>
                                    <p className="text-muted-foreground text-sm">বন্ধ থাকলে EMI/কিস্তি সংক্রান্ত কোনো কিছুই কোথাও দেখাবে না</p>
                                </div>
                                <Switch
                                    id="emi_module_enabled"
                                    checked={data.emi_module_enabled}
                                    onCheckedChange={(checked) => setData('emi_module_enabled', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="serial_number_module_enabled">Serial Number Tracking</Label>
                                    <p className="text-muted-foreground text-sm">বন্ধ থাকলে Sale form-এ Serial Number input দেখাবে না</p>
                                </div>
                                <Switch
                                    id="serial_number_module_enabled"
                                    checked={data.serial_number_module_enabled}
                                    onCheckedChange={(checked) => setData('serial_number_module_enabled', checked)}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="pagination" className="space-y-6">
                            <div className="grid gap-2">
                                <Label>Rows-per-page options</Label>
                                <p className="text-muted-foreground text-sm">
                                    প্রতিটা list পেজের "কত সারি দেখাবো" dropdown-এ এই সংখ্যাগুলোই দেখাবে — globally সব টেবিলে প্রযোজ্য
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {data.pagination_per_page_options.map((option) => (
                                        <Badge key={option} variant="secondary" className="gap-1 py-1 pr-1 pl-3 text-sm">
                                            {option}
                                            <button
                                                type="button"
                                                onClick={() => removePerPageOption(option)}
                                                className="hover:bg-background/50 rounded-full p-0.5"
                                                aria-label={`Remove ${option}`}
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <InputError message={errors.pagination_per_page_options} />

                                <div className="mt-2 flex items-end gap-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="new_pagination_option">Add an option</Label>
                                        <Select value={newPerPageOption} onValueChange={setNewPerPageOption}>
                                            <SelectTrigger id="new_pagination_option" className="w-32">
                                                <SelectValue placeholder="Pick a number" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availablePerPagePresets.map((option) => (
                                                    <SelectItem key={option} value={String(option)}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="button" variant="outline" onClick={addPerPageOption} disabled={!newPerPageOption}>
                                        Add
                                    </Button>
                                </div>
                            </div>

                            <div className="max-w-48">
                                <FormSelect
                                    id="pagination_default_per_page"
                                    label="Default rows per page"
                                    value={data.pagination_default_per_page}
                                    onChange={(val) => val && setData('pagination_default_per_page', Number(val))}
                                    options={data.pagination_per_page_options.map((option) => ({ value: String(option), label: String(option) }))}
                                    error={errors.pagination_default_per_page}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="pagination_allow_all">Allow &quot;Show all&quot; option</Label>
                                    <p className="text-muted-foreground text-sm">
                                        চালু থাকলে dropdown-এ "Show all"ও থাকবে — বড় তালিকায় একসাথে সব ডেটা লোড হবে
                                    </p>
                                </div>
                                <Switch
                                    id="pagination_allow_all"
                                    checked={data.pagination_allow_all}
                                    onCheckedChange={(checked) => setData('pagination_allow_all', checked)}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="audit" className="space-y-6">
                            <div className="max-w-48 space-y-2">
                                <p className="text-muted-foreground text-sm">
                                    কে কী পরিবর্তন করেছে তার লগ কতদিন রাখা হবে — এর চেয়ে পুরনো লগ প্রতি মাসে স্বয়ংক্রিয়ভাবে মুছে যাবে
                                </p>
                                <FormSelect
                                    id="activity_log_retention_months"
                                    label="Activity log retention"
                                    value={data.activity_log_retention_months}
                                    onChange={(val) => val && setData('activity_log_retention_months', Number(val))}
                                    options={ACTIVITY_LOG_RETENTION_OPTIONS.map((option) => ({ value: String(option), label: `${option} months` }))}
                                    error={errors.activity_log_retention_months}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing}>{processing ? 'Saving...' : 'Save'}</Button>

                        <Transition
                            show={recentlySuccessful}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <p className="text-muted-foreground text-sm">Saved</p>
                        </Transition>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
