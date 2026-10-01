import InvoicePreview from '@/components/invoice-settings/invoice-preview';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type InvoiceSettingsConfig, type InvoiceShopInfo } from '@/types/models';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Invoice Settings', href: '/invoice-settings' }];

interface InvoiceSettingsProps {
    settings: InvoiceSettingsConfig;
    logoUrl: string | null;
    shop: InvoiceShopInfo;
}

/** A boolean toggle row — same style `business-settings/index.tsx` already uses for its Modules tab. */
function ToggleRow({ id, label, description, checked, onCheckedChange }: { id: string; label: string; description?: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-0.5">
                <Label htmlFor={id}>{label}</Label>
                {description && <p className="text-muted-foreground text-sm">{description}</p>}
            </div>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
}

export default function InvoiceSettingsIndex({ settings, logoUrl, shop }: InvoiceSettingsProps) {
    const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, transform, errors, processing, recentlySuccessful } = useForm<InvoiceSettingsConfig & { logo: File | null }>({
        ...settings,
        logo: null,
    });

    // Laravel returns dot-path keys for nested fields (e.g. "general.title"), which
    // don't match `keyof TForm` — widen the type at the point of use instead.
    const fieldErrors = errors as Record<string, string | undefined>;

    const updateSection = <K extends keyof InvoiceSettingsConfig>(section: K, patch: Partial<InvoiceSettingsConfig[K]>) => {
        // Inertia's `setData<K>` generic can't be proven to match `InvoiceSettingsConfig[K]` from
        // inside a generic helper (a known TS limitation with indexed-access + generics) — narrow
        // the function reference itself instead of loosening the (correct) value type.
        const setSection = setData as (key: K, value: InvoiceSettingsConfig[K]) => void;
        setSection(section, { ...data[section], ...patch });
    };

    const onLogoChange = (file: File | null) => {
        setData('logo', file);
        setLogoPreview(file ? URL.createObjectURL(file) : logoUrl);
    };

    const clearLogo = () => {
        setData('logo', null);
        setLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const [newTerm, setNewTerm] = useState('');

    const addTerm = () => {
        if (!newTerm.trim()) return;
        updateSection('terms', { items: [...data.terms.items, newTerm.trim()] });
        setNewTerm('');
    };

    const removeTerm = (index: number) => {
        updateSection('terms', { items: data.terms.items.filter((_, i) => i !== index) });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        transform((formData) => ({ ...formData, _method: 'patch' }));
        post(route('invoice-settings.update'), { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Invoice Settings" />

            <div className="px-4 py-6">
                <HeadingSmall title="Invoice Settings" description="প্রিন্ট করা invoice-এ কী কী দেখাবে সেটা কনফিগার করুন" />

                <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="space-y-6">
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="flex-wrap">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="branding">Branding</TabsTrigger>
                                <TabsTrigger value="business">Business</TabsTrigger>
                                <TabsTrigger value="customer">Customer</TabsTrigger>
                                <TabsTrigger value="items">Items</TabsTrigger>
                                <TabsTrigger value="totals">Totals</TabsTrigger>
                                <TabsTrigger value="terms">Terms</TabsTrigger>
                                <TabsTrigger value="footer">Footer</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-4">
                                <FormInput
                                    id="general_title"
                                    label="Invoice Title"
                                    value={data.general.title}
                                    onChange={(e) => updateSection('general', { title: e.target.value })}
                                    error={fieldErrors['general.title']}
                                />
                                <FormInput
                                    id="general_subtitle"
                                    label="Invoice Subtitle"
                                    value={data.general.subtitle}
                                    onChange={(e) => updateSection('general', { subtitle: e.target.value })}
                                    error={fieldErrors['general.subtitle']}
                                />
                                <ToggleRow
                                    id="show_number"
                                    label="Show Invoice Number"
                                    checked={data.general.show_number}
                                    onCheckedChange={(checked) => updateSection('general', { show_number: checked })}
                                />
                                <ToggleRow
                                    id="show_date"
                                    label="Show Invoice Date"
                                    checked={data.general.show_date}
                                    onCheckedChange={(checked) => updateSection('general', { show_date: checked })}
                                />
                                <ToggleRow
                                    id="show_due_date"
                                    label="Show Due Date"
                                    description="এখনো কোনো due date field sale-এ নেই — preview-তেই শুধু প্রযোজ্য"
                                    checked={data.general.show_due_date}
                                    onCheckedChange={(checked) => updateSection('general', { show_due_date: checked })}
                                />
                            </TabsContent>

                            <TabsContent value="branding" className="space-y-4">
                                <ToggleRow
                                    id="show_logo"
                                    label="Show Logo"
                                    checked={data.branding.show_logo}
                                    onCheckedChange={(checked) => updateSection('branding', { show_logo: checked })}
                                />

                                <div className="grid min-w-0 content-start gap-2">
                                    <Label htmlFor="logo">Logo Image</Label>
                                    <input
                                        ref={fileInputRef}
                                        id="logo"
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
                                    />
                                    {logoPreview ? (
                                        <div className="flex items-start gap-4 rounded-lg border bg-background p-3">
                                            <img src={logoPreview} alt="Logo preview" className="h-16 w-auto shrink-0 rounded-md border object-contain p-1" />
                                            <div className="flex flex-1 flex-col gap-2">
                                                <p className="text-muted-foreground text-xs">PNG, JPG, WEBP — max 2MB</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                                                        <ImagePlus className="size-3.5" />
                                                        Replace
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="sm" onClick={clearLogo} className="text-destructive hover:text-destructive gap-1.5">
                                                        <X className="size-3.5" />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 py-8 transition-colors"
                                        >
                                            <div className="ring-border flex size-11 items-center justify-center rounded-full bg-background ring-1">
                                                <ImagePlus className="text-muted-foreground size-5" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium">Click to upload a logo</p>
                                                <p className="text-muted-foreground text-xs">PNG, JPG, WEBP · up to 2MB</p>
                                            </div>
                                        </button>
                                    )}
                                    <InputError message={fieldErrors.logo} />
                                </div>
                            </TabsContent>

                            <TabsContent value="business" className="space-y-4">
                                <ToggleRow
                                    id="business_show_name"
                                    label="Show Business Name"
                                    checked={data.business.show_name}
                                    onCheckedChange={(checked) => updateSection('business', { show_name: checked })}
                                />
                                <ToggleRow
                                    id="business_show_address"
                                    label="Show Address"
                                    checked={data.business.show_address}
                                    onCheckedChange={(checked) => updateSection('business', { show_address: checked })}
                                />
                                <ToggleRow
                                    id="business_show_phone"
                                    label="Show Phone"
                                    checked={data.business.show_phone}
                                    onCheckedChange={(checked) => updateSection('business', { show_phone: checked })}
                                />
                            </TabsContent>

                            <TabsContent value="customer" className="space-y-4">
                                <ToggleRow
                                    id="customer_show_name"
                                    label="Show Customer Name"
                                    checked={data.customer.show_name}
                                    onCheckedChange={(checked) => updateSection('customer', { show_name: checked })}
                                />
                                <ToggleRow
                                    id="customer_show_phone"
                                    label="Show Phone"
                                    checked={data.customer.show_phone}
                                    onCheckedChange={(checked) => updateSection('customer', { show_phone: checked })}
                                />
                                <ToggleRow
                                    id="customer_show_email"
                                    label="Show Email"
                                    checked={data.customer.show_email}
                                    onCheckedChange={(checked) => updateSection('customer', { show_email: checked })}
                                />
                                <ToggleRow
                                    id="customer_show_address"
                                    label="Show Address"
                                    checked={data.customer.show_address}
                                    onCheckedChange={(checked) => updateSection('customer', { show_address: checked })}
                                />
                            </TabsContent>

                            <TabsContent value="items" className="space-y-4">
                                <ToggleRow
                                    id="items_show_sku"
                                    label="Show SKU"
                                    checked={data.items.show_sku}
                                    onCheckedChange={(checked) => updateSection('items', { show_sku: checked })}
                                />
                                <ToggleRow
                                    id="items_show_unit"
                                    label="Show Unit"
                                    checked={data.items.show_unit}
                                    onCheckedChange={(checked) => updateSection('items', { show_unit: checked })}
                                />
                                <ToggleRow
                                    id="items_show_discount"
                                    label="Show Item Discount"
                                    checked={data.items.show_discount}
                                    onCheckedChange={(checked) => updateSection('items', { show_discount: checked })}
                                />
                            </TabsContent>

                            <TabsContent value="totals" className="space-y-4">
                                <ToggleRow
                                    id="totals_show_discount"
                                    label="Show Discount"
                                    checked={data.totals.show_discount}
                                    onCheckedChange={(checked) => updateSection('totals', { show_discount: checked })}
                                />
                                <ToggleRow
                                    id="totals_show_paid"
                                    label="Show Paid Amount"
                                    checked={data.totals.show_paid}
                                    onCheckedChange={(checked) => updateSection('totals', { show_paid: checked })}
                                />
                                <ToggleRow
                                    id="totals_show_due"
                                    label="Show Due Amount"
                                    checked={data.totals.show_due}
                                    onCheckedChange={(checked) => updateSection('totals', { show_due: checked })}
                                />
                            </TabsContent>

                            <TabsContent value="terms" className="space-y-4">
                                <ToggleRow
                                    id="terms_enabled"
                                    label="Show Terms &amp; Conditions"
                                    checked={data.terms.enabled}
                                    onCheckedChange={(checked) => updateSection('terms', { enabled: checked })}
                                />

                                <div className="space-y-2">
                                    {data.terms.items.map((term, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <span className="text-muted-foreground w-5 shrink-0 text-sm">{index + 1}.</span>
                                            <FormInput
                                                id={`term_${index}`}
                                                value={term}
                                                onChange={(e) => {
                                                    const items = [...data.terms.items];
                                                    items[index] = e.target.value;
                                                    updateSection('terms', { items });
                                                }}
                                                className="flex-1"
                                            />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTerm(index)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}

                                    <div className="flex items-center gap-2">
                                        <FormInput
                                            id="new_term"
                                            placeholder="Add a term..."
                                            value={newTerm}
                                            onChange={(e) => setNewTerm(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button type="button" variant="outline" onClick={addTerm} className="gap-1.5">
                                            <Plus className="size-4" />
                                            Add Term
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="footer" className="space-y-4">
                                <ToggleRow
                                    id="footer_enabled"
                                    label="Show Footer"
                                    checked={data.footer.enabled}
                                    onCheckedChange={(checked) => updateSection('footer', { enabled: checked })}
                                />
                                <FormInput
                                    id="footer_text"
                                    label="Footer Text"
                                    value={data.footer.text}
                                    onChange={(e) => updateSection('footer', { text: e.target.value })}
                                    error={fieldErrors['footer.text']}
                                />
                            </TabsContent>
                        </Tabs>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>{processing ? 'Saving...' : 'Save Changes'}</Button>

                            <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                                <p className="text-muted-foreground text-sm">Saved</p>
                            </Transition>
                        </div>
                    </div>

                    <div>
                        <p className="text-muted-foreground mb-2 text-sm font-medium">Live Preview</p>
                        <InvoicePreview settings={data} logoPreview={logoPreview} shop={shop} />
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
