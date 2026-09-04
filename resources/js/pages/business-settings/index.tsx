import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Settings } from '@/types/models';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Business Settings',
        href: '/business-settings',
    },
];

export default function BusinessSettingsIndex({ settings }: { settings: Settings }) {
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
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('business-settings.update'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Business Settings" />

            <div className="px-4 py-6">
                <HeadingSmall title="Business Settings" description="Shop info, invoice numbering ও optional module toggle" />

                <form onSubmit={submit} className="mt-6 space-y-6">
                    <Tabs defaultValue="business" className="w-full">
                        <TabsList>
                            <TabsTrigger value="business">Business</TabsTrigger>
                            <TabsTrigger value="invoice">Invoice</TabsTrigger>
                            <TabsTrigger value="modules">Modules</TabsTrigger>
                        </TabsList>

                        <TabsContent value="business" className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="shop_name">Shop Name</Label>
                                <Input
                                    id="shop_name"
                                    value={data.shop_name}
                                    onChange={(e) => setData('shop_name', e.target.value)}
                                    required
                                />
                                <InputError message={errors.shop_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="shop_address">Shop Address</Label>
                                <Input
                                    id="shop_address"
                                    value={data.shop_address}
                                    onChange={(e) => setData('shop_address', e.target.value)}
                                />
                                <InputError message={errors.shop_address} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="shop_phone">Shop Phone</Label>
                                <Input
                                    id="shop_phone"
                                    value={data.shop_phone}
                                    onChange={(e) => setData('shop_phone', e.target.value)}
                                />
                                <InputError message={errors.shop_phone} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="currency_symbol">Currency Symbol</Label>
                                <Input
                                    id="currency_symbol"
                                    className="max-w-24"
                                    value={data.currency_symbol}
                                    onChange={(e) => setData('currency_symbol', e.target.value)}
                                    required
                                />
                                <InputError message={errors.currency_symbol} />
                            </div>
                        </TabsContent>

                        <TabsContent value="invoice" className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                                    <Input
                                        id="invoice_prefix"
                                        value={data.invoice_prefix}
                                        onChange={(e) => setData('invoice_prefix', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.invoice_prefix} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="invoice_next_number">Next Invoice Number</Label>
                                    <Input
                                        id="invoice_next_number"
                                        type="number"
                                        min={1}
                                        value={data.invoice_next_number}
                                        onChange={(e) => setData('invoice_next_number', Number(e.target.value))}
                                        required
                                    />
                                    <InputError message={errors.invoice_next_number} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="purchase_prefix">Purchase Prefix</Label>
                                    <Input
                                        id="purchase_prefix"
                                        value={data.purchase_prefix}
                                        onChange={(e) => setData('purchase_prefix', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.purchase_prefix} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="purchase_next_number">Next Purchase Number</Label>
                                    <Input
                                        id="purchase_next_number"
                                        type="number"
                                        min={1}
                                        value={data.purchase_next_number}
                                        onChange={(e) => setData('purchase_next_number', Number(e.target.value))}
                                        required
                                    />
                                    <InputError message={errors.purchase_next_number} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="fiscal_year_start_month">Fiscal Year Start Month (1-12)</Label>
                                <Input
                                    id="fiscal_year_start_month"
                                    type="number"
                                    min={1}
                                    max={12}
                                    className="max-w-24"
                                    value={data.fiscal_year_start_month}
                                    onChange={(e) => setData('fiscal_year_start_month', Number(e.target.value))}
                                    required
                                />
                                <InputError message={errors.fiscal_year_start_month} />
                            </div>
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
                            <p className="text-sm text-neutral-600">Saved</p>
                        </Transition>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
