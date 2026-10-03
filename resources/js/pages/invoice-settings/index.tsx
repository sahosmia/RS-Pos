import InvoicePreview from '@/components/invoice-settings/invoice-preview';
import { FormInput } from '@/components/form/form-input';
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
import {
    ImagePlus,
    Plus,
    Trash2,
    X,
    FileText,
    Palette,
    Store,
    UserRound,
    Package,
    Calculator,
    ListChecks,
    PanelsTopLeft,
    Eye,
    Save,
} from 'lucide-react';
import { type FormEventHandler, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Invoice Settings', href: '/invoice-settings' },
];

interface InvoiceSettingsProps {
    settings: InvoiceSettingsConfig;
    logoUrl: string | null;
    shop: InvoiceShopInfo;
}

function SectionCard({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string;
    description?: string;
    icon: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-start gap-3 border-b bg-muted/20 px-4 py-4 sm:px-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="font-semibold tracking-tight">{title}</h2>
                    {description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">{children}</div>
        </section>
    );
}

function ToggleRow({
    id,
    label,
    description,
    checked,
    onCheckedChange,
}: {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-background px-3 py-3 transition-colors hover:bg-muted/30 sm:px-4">
            <div className="min-w-0 space-y-1">
                <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
                    {label}
                </Label>
                {description && (
                    <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {description}
                    </p>
                )}
            </div>
            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
                className="shrink-0"
            />
        </div>
    );
}

export default function InvoiceSettingsIndex({
    settings,
    logoUrl,
    shop,
}: InvoiceSettingsProps) {
    const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl);
    const [newTerm, setNewTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        post,
        transform,
        errors,
        processing,
        recentlySuccessful,
    } = useForm<InvoiceSettingsConfig & { logo: File | null }>({
        ...settings,
        logo: null,
    });

    const fieldErrors = errors as Record<string, string | undefined>;

    const updateSection = <K extends keyof InvoiceSettingsConfig>(
        section: K,
        patch: Partial<InvoiceSettingsConfig[K]>,
    ) => {
        const setSection = setData as (
            key: K,
            value: InvoiceSettingsConfig[K],
        ) => void;

        setSection(section, {
            ...data[section],
            ...patch,
        });
    };

    const onLogoChange = (file: File | null) => {
        setData('logo', file);
        setLogoPreview(file ? URL.createObjectURL(file) : logoUrl);
    };

    const clearLogo = () => {
        setData('logo', null);
        setLogoPreview(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const addTerm = () => {
        const term = newTerm.trim();
        if (!term) return;

        updateSection('terms', {
            items: [...data.terms.items, term],
        });
        setNewTerm('');
    };

    const removeTerm = (index: number) => {
        updateSection('terms', {
            items: data.terms.items.filter((_, i) => i !== index),
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        transform((formData) => ({
            ...formData,
            _method: 'patch',
        }));

        post(route('invoice-settings.update'), {
            forceFormData: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Invoice Settings" />

            <div className="min-h-full bg-muted/20">
                <div className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
                    {/* Page header */}
                    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                                <FileText className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                                    Invoice Settings
                                </h1>
                                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                    আপনার invoice-এর layout, branding এবং কোন
                                    তথ্যগুলো print হবে তা কনফিগার করুন।
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:self-center">
                            <span
                                className={`size-2 rounded-full ${
                                    recentlySuccessful
                                        ? 'bg-green-500'
                                        : processing
                                          ? 'animate-pulse bg-amber-500'
                                          : 'bg-muted-foreground/50'
                                }`}
                            />
                            {processing
                                ? 'Saving changes...'
                                : recentlySuccessful
                                  ? 'Changes saved'
                                  : 'Unsaved changes may be present'}
                        </div>
                    </div>

                    {/* Overview cards */}
                    <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {[
                            {
                                label: 'Invoice Sections',
                                value: '8',
                                icon: PanelsTopLeft,
                            },
                            {
                                label: 'Live Preview',
                                value: 'Enabled',
                                icon: Eye,
                            },
                            {
                                label: 'Branding',
                                value: data.branding.show_logo ? 'On' : 'Off',
                                icon: Palette,
                            },
                            {
                                label: 'Terms',
                                value: data.terms.enabled ? 'On' : 'Off',
                                icon: ListChecks,
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:p-4"
                            >
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:size-10">
                                    <item.icon className="size-4 sm:size-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-xs text-muted-foreground">
                                        {item.label}
                                    </p>
                                    <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">
                                        {item.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={submit}>
                        <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] 2xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
                            {/* Settings */}
                            <div className="min-w-0 space-y-5">
                                <Tabs defaultValue="general" className="w-full">
                                    <div className="mb-5 overflow-x-auto rounded-xl border bg-card p-1.5 shadow-sm">
                                        <TabsList className="flex h-auto w-max min-w-full flex-nowrap justify-start gap-1 bg-transparent">
                                            <TabsTrigger value="general" className="gap-2 rounded-lg px-3 py-2">
                                                <FileText className="size-4" />
                                                General
                                            </TabsTrigger>
                                            <TabsTrigger value="branding" className="gap-2 rounded-lg px-3 py-2">
                                                <Palette className="size-4" />
                                                Branding
                                            </TabsTrigger>
                                            <TabsTrigger value="business" className="gap-2 rounded-lg px-3 py-2">
                                                <Store className="size-4" />
                                                Business
                                            </TabsTrigger>
                                            <TabsTrigger value="customer" className="gap-2 rounded-lg px-3 py-2">
                                                <UserRound className="size-4" />
                                                Customer
                                            </TabsTrigger>
                                            <TabsTrigger value="items" className="gap-2 rounded-lg px-3 py-2">
                                                <Package className="size-4" />
                                                Items
                                            </TabsTrigger>
                                            <TabsTrigger value="totals" className="gap-2 rounded-lg px-3 py-2">
                                                <Calculator className="size-4" />
                                                Totals
                                            </TabsTrigger>
                                            <TabsTrigger value="terms" className="gap-2 rounded-lg px-3 py-2">
                                                <ListChecks className="size-4" />
                                                Terms
                                            </TabsTrigger>
                                            <TabsTrigger value="footer" className="gap-2 rounded-lg px-3 py-2">
                                                <PanelsTopLeft className="size-4" />
                                                Footer
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent value="general" className="mt-0">
                                        <SectionCard
                                            title="General Information"
                                            description="Invoice-এর title, subtitle এবং date visibility নিয়ন্ত্রণ করুন।"
                                            icon={FileText}
                                        >
                                            <FormInput
                                                id="general_title"
                                                label="Invoice Title"
                                                value={data.general.title}
                                                onChange={(e) =>
                                                    updateSection('general', {
                                                        title: e.target.value,
                                                    })
                                                }
                                                error={fieldErrors['general.title']}
                                            />
                                            <FormInput
                                                id="general_subtitle"
                                                label="Invoice Subtitle"
                                                value={data.general.subtitle}
                                                onChange={(e) =>
                                                    updateSection('general', {
                                                        subtitle: e.target.value,
                                                    })
                                                }
                                                error={fieldErrors['general.subtitle']}
                                            />
                                            <div className="space-y-2 pt-1">
                                                <p className="text-sm font-medium">
                                                    Invoice Details
                                                </p>
                                                <ToggleRow
                                                    id="show_number"
                                                    label="Invoice Number"
                                                    description="Invoice-এর unique number দেখাবে"
                                                    checked={data.general.show_number}
                                                    onCheckedChange={(checked) =>
                                                        updateSection('general', {
                                                            show_number: checked,
                                                        })
                                                    }
                                                />
                                                <ToggleRow
                                                    id="show_date"
                                                    label="Invoice Date"
                                                    description="Invoice তৈরি হওয়ার তারিখ দেখাবে"
                                                    checked={data.general.show_date}
                                                    onCheckedChange={(checked) =>
                                                        updateSection('general', {
                                                            show_date: checked,
                                                        })
                                                    }
                                                />
                                                <ToggleRow
                                                    id="show_due_date"
                                                    label="Due Date"
                                                    description="প্রযোজ্য ক্ষেত্রে invoice-এর due date দেখাবে"
                                                    checked={data.general.show_due_date}
                                                    onCheckedChange={(checked) =>
                                                        updateSection('general', {
                                                            show_due_date: checked,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </SectionCard>
                                    </TabsContent>

                                    <TabsContent value="branding" className="mt-0">
                                        <SectionCard
                                            title="Invoice Branding"
                                            description="আপনার invoice-এ business logo দেখানো ও পরিবর্তন করুন।"
                                            icon={Palette}
                                        >
                                            <ToggleRow
                                                id="show_logo"
                                                label="Show Business Logo"
                                                description="Invoice-এর header-এ logo দেখাবে"
                                                checked={data.branding.show_logo}
                                                onCheckedChange={(checked) =>
                                                    updateSection('branding', {
                                                        show_logo: checked,
                                                    })
                                                }
                                            />

                                            <div className="space-y-2">
                                                <Label htmlFor="logo">Logo Image</Label>
                                                <input
                                                    ref={fileInputRef}
                                                    id="logo"
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp"
                                                    className="sr-only"
                                                    onChange={(e) =>
                                                        onLogoChange(
                                                            e.target.files?.[0] ?? null,
                                                        )
                                                    }
                                                />

                                                {logoPreview ? (
                                                    <div className="rounded-2xl border bg-muted/20 p-4">
                                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                                            <div className="flex h-28 w-full items-center justify-center rounded-xl border bg-background p-3 sm:size-28 sm:shrink-0">
                                                                <img
                                                                    src={logoPreview}
                                                                    alt="Logo preview"
                                                                    className="max-h-full max-w-full object-contain"
                                                                />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-medium">
                                                                    Logo preview
                                                                </p>
                                                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                                    PNG, JPG অথবা WEBP
                                                                    ফরম্যাট ব্যবহার করুন।
                                                                    সর্বোচ্চ সাইজ 2MB।
                                                                </p>
                                                                <div className="mt-3 flex flex-wrap gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            fileInputRef.current?.click()
                                                                        }
                                                                    >
                                                                        <ImagePlus className="mr-2 size-4" />
                                                                        Replace
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-destructive hover:text-destructive"
                                                                        onClick={clearLogo}
                                                                    >
                                                                        <X className="mr-2 size-4" />
                                                                        Remove
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            fileInputRef.current?.click()
                                                        }
                                                        className="group flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 px-4 py-7 text-center transition hover:border-primary/50 hover:bg-primary/5"
                                                    >
                                                        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border bg-background text-muted-foreground shadow-sm transition group-hover:text-primary">
                                                            <ImagePlus className="size-6" />
                                                        </div>
                                                        <p className="text-sm font-semibold">
                                                            Upload your logo
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Browse PNG, JPG or WEBP
                                                        </p>
                                                        <span className="mt-3 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                                                            Maximum file size: 2MB
                                                        </span>
                                                    </button>
                                                )}
                                                <InputError message={fieldErrors.logo} />
                                            </div>
                                        </SectionCard>
                                    </TabsContent>

                                    <TabsContent value="business" className="mt-0">
                                        <SectionCard
                                            title="Business Information"
                                            description="Invoice-এ business-এর কোন তথ্যগুলো দেখানো হবে তা নির্বাচন করুন।"
                                            icon={Store}
                                        >
                                            <ToggleRow
                                                id="business_show_name"
                                                label="Business Name"
                                                checked={data.business.show_name}
                                                onCheckedChange={(checked) =>
                                                    updateSection('business', {
                                                        show_name: checked,
                                                    })
                                                }
                                            />
                                            <ToggleRow
                                                id="business_show_address"
                                                label="Business Address"
                                                checked={data.business.show_address}
                                                onCheckedChange={(checked) =>
                                                    updateSection('business', {
                                                        show_address: checked,
                                                    })
                                                }
                                            />
                                            <ToggleRow
                                                id="business_show_phone"
                                                label="Business Phone"
                                                checked={data.business.show_phone}
                                                onCheckedChange={(checked) =>
                                                    updateSection('business', {
                                                        show_phone: checked,
                                                    })
                                                }
                                            />
                                        </SectionCard>
                                    </TabsContent>

                                    <TabsContent value="customer" className="mt-0">
                                        <SectionCard
                                            title="Customer Information"
                                            description="Customer-এর কোন কোন detail invoice-এ থাকবে তা নিয়ন্ত্রণ করুন।"
                                            icon={UserRound}
                                        >
                                            <ToggleRow
                                                id="customer_show_name"
                                                label="Customer Name"
                                                checked={data.customer.show_name}
                                                onCheckedChange={(checked) =>
                                                    updateSection('customer', {
                                                        show_name: checked,
                                                    })
                                                }
                                            />
                                            <ToggleRow
                                                id="customer_show_phone"
                                                label="Phone Number"
                                                checked={data.customer.show_phone}
                                                onCheckedChange={(checked) =>
                                                    updateSection('customer', {
                                                        show_phone: checked,
                                                    })
                                                }
                                            />
                                            <ToggleRow
                                                id="customer_show_email"
                                                label="Email Address"
                                                checked={data.customer.show_email}
                                                onCheckedChange={(checked) =>
                                                    updateSection('customer', {
                                                        show_email: checked,
                                                    })
                                                }
                                            />
                                            <ToggleRow
                                                id="customer_show_address"
                                                label="Customer Address"
                                                checked={data.customer.show_address}
                                                onCheckedChange={(checked) =>
                                                    updateSection('customer', {
                                                        show_address: checked,
                                                    })
                                                }
                                            />
                                        </SectionCard>
                                    </TabsContent>

                                    <TabsContent value="items" className="mt-0">
                                        <SectionCard
                                            title="Invoice Items"
                                            description="Item table-এ কোন অতিরিক্ত তথ্য দেখানো হবে তা নির্ধারণ করুন।"
                                            icon={Package}
                                        >
                                            <ToggleRow
                                                id="items_show_sku"
                                                label="Product SKU"
                                                description="প্রতিটি item-এর SKU দেখাবে"
                                                checked={data.items.show_sku}
                                                onCheckedChange={(checked) =>
                                                    updateSection('items', {
                                                        show_sku: checked,
                                                    })
                                                }
                                            />
                                            <ToggleRow
                                                id="items_show_unit"
                                                label="Product Unit"
                                                checked={data.items.show_unit}
                                                onCheckedChange={(checked) =>
                                                    updateSection('items', {
                                                        show_unit: checked,
                                                    })
                                                }
                                            />
                                            <ToggleRow
                                                id="items_show_discount"
                                                label="Item Discount"
                                                checked={data.items.show_discount}
                                                onCheckedChange={(checked) =>
                                                    updateSection('items', {
                                                        show_discount: checked,
                                                    })
                                                }
                                            />
                                        </SectionCard>
                                    </TabsContent>

                                    <TabsContent value="totals" className="mt-0">
                                        <SectionCard
                                            title="Invoice Totals"
                                            description="Invoice-এর total summary-তে কোন amount দেখাবে তা নির্বাচন করুন।"
                                            icon={Calculator}
                                        >
                                            <ToggleRow
                                                id="totals_show_discount"
                                                label="Discount"
                                                checked={data.totals.show_discount}
                                                onCheckedChange={(checked) =>
                                                    updateSection('totals', {
                                                        show_discount: checked,
                                                    })
                                                }
                                            />
                                            <ToggleRow
                                                id="totals_show_paid"
                                                label="Paid Amount"
                                                checked={data.totals.show_paid}
                                                onCheckedChange={(checked) =>
                                                    updateSection('totals', {
                                                        show_paid: checked,
                                                    })
                                                }
                                            />
                                            <ToggleRow
                                                id="totals_show_due"
                                                label="Due Amount"
                                                checked={data.totals.show_due}
                                                onCheckedChange={(checked) =>
                                                    updateSection('totals', {
                                                        show_due: checked,
                                                    })
                                                }
                                            />
                                        </SectionCard>
                                    </TabsContent>

                                    <TabsContent value="terms" className="mt-0">
                                        <SectionCard
                                            title="Terms & Conditions"
                                            description="Invoice-এর শেষে প্রযোজ্য শর্তাবলি যোগ বা পরিবর্তন করুন।"
                                            icon={ListChecks}
                                        >
                                            <ToggleRow
                                                id="terms_enabled"
                                                label="Show Terms & Conditions"
                                                description="Invoice-এ terms section দেখাবে"
                                                checked={data.terms.enabled}
                                                onCheckedChange={(checked) =>
                                                    updateSection('terms', {
                                                        enabled: checked,
                                                    })
                                                }
                                            />

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-medium">
                                                        Terms list
                                                    </p>
                                                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                                        {data.terms.items.length} items
                                                    </span>
                                                </div>

                                                {data.terms.items.length === 0 && (
                                                    <div className="rounded-xl border border-dashed py-7 text-center">
                                                        <ListChecks className="mx-auto size-7 text-muted-foreground/60" />
                                                        <p className="mt-2 text-sm font-medium">
                                                            No terms added
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            নিচের field ব্যবহার করে নতুন term যোগ করুন।
                                                        </p>
                                                    </div>
                                                )}

                                                {data.terms.items.map((term, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex min-w-0 items-center gap-2 rounded-xl border bg-background p-2"
                                                    >
                                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                                                            {index + 1}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <FormInput
                                                                id={`term_${index}`}
                                                                value={term}
                                                                onChange={(e) => {
                                                                    const items = [
                                                                        ...data.terms.items,
                                                                    ];
                                                                    items[index] =
                                                                        e.target.value;
                                                                    updateSection('terms', {
                                                                        items,
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Remove term ${index + 1}`}
                                                            className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() =>
                                                                removeTerm(index)
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                ))}

                                                <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                                                    <div className="min-w-0 flex-1">
                                                        <FormInput
                                                            id="new_term"
                                                            placeholder="Write a new term..."
                                                            value={newTerm}
                                                            onChange={(e) =>
                                                                setNewTerm(e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={!newTerm.trim()}
                                                        onClick={addTerm}
                                                        className="w-full shrink-0 sm:w-auto"
                                                    >
                                                        <Plus className="mr-2 size-4" />
                                                        Add Term
                                                    </Button>
                                                </div>
                                            </div>
                                        </SectionCard>
                                    </TabsContent>

                                    <TabsContent value="footer" className="mt-0">
                                        <SectionCard
                                            title="Invoice Footer"
                                            description="Invoice-এর নিচের অংশে একটি custom message দেখান।"
                                            icon={PanelsTopLeft}
                                        >
                                            <ToggleRow
                                                id="footer_enabled"
                                                label="Show Footer"
                                                description="Invoice-এর bottom section-এ footer text দেখাবে"
                                                checked={data.footer.enabled}
                                                onCheckedChange={(checked) =>
                                                    updateSection('footer', {
                                                        enabled: checked,
                                                    })
                                                }
                                            />
                                            <FormInput
                                                id="footer_text"
                                                label="Footer Text"
                                                value={data.footer.text}
                                                onChange={(e) =>
                                                    updateSection('footer', {
                                                        text: e.target.value,
                                                    })
                                                }
                                                error={fieldErrors['footer.text']}
                                            />
                                        </SectionCard>
                                    </TabsContent>
                                </Tabs>

                                {/* Save panel */}
                                <div className="sticky bottom-3 z-10 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur-md sm:p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <Save className="size-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    Save invoice settings
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Changes apply after saving.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Transition
                                                show={recentlySuccessful}
                                                enter="transition ease-out duration-200"
                                                enterFrom="translate-y-1 opacity-0"
                                                enterTo="translate-y-0 opacity-100"
                                                leave="transition ease-in duration-150"
                                                leaveFrom="opacity-100"
                                                leaveTo="opacity-0"
                                            >
                                                <span className="text-sm font-medium text-green-600">
                                                    Saved successfully
                                                </span>
                                            </Transition>
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                className="w-full min-w-32 sm:w-auto"
                                            >
                                                {processing ? (
                                                    'Saving...'
                                                ) : (
                                                    <>
                                                        <Save className="mr-2 size-4" />
                                                        Save Changes
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live preview */}
                            <aside className="min-w-0 xl:sticky xl:top-5">
                                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                                    <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <Eye className="size-5" />
                                            </div>
                                            <div>
                                                <h2 className="font-semibold">
                                                    Live Preview
                                                </h2>
                                                <p className="text-xs text-muted-foreground">
                                                    Changes update instantly
                                                </p>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                                            Live
                                        </span>
                                    </div>
                                    <div className="bg-muted/30 p-3 sm:p-5">
                                        <div className="mx-auto w-full max-w-[620px]">
                                            <InvoicePreview
                                                settings={data}
                                                logoPreview={logoPreview}
                                                shop={shop}
                                            />
                                        </div>
                                    </div>
                                    <div className="border-t px-4 py-3">
                                        <p className="text-center text-xs text-muted-foreground">
                                            Preview is for layout reference. Final
                                            appearance may depend on print settings.
                                        </p>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
