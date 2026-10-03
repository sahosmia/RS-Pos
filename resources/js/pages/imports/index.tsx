
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    FileSpreadsheet,
    Info,
    Package,
    Users,
    Boxes,
    ShoppingCart,
    Upload,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Import Tools', href: '/imports' },
];

interface ImportResultProps {
    label: string;
    created: number;
    skipped: number;
    messages: string[];
}

interface ImportsIndexProps {
    result: ImportResultProps | null;
}

interface UploadFormProps {
    routeName: string;
    columns: string;
    note?: string;
}

function UploadForm({ routeName, columns, note }: UploadFormProps) {
    const form = useForm<{ file: File | null }>({ file: null });

    const submit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();

        if (!form.data.file || form.processing) return;

        form.post(route(routeName), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="rounded-xl border bg-muted/30 p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                    <Info className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold">
                        Expected Columns
                    </h3>
                </div>

                <p className="break-words rounded-lg bg-background p-3 font-mono text-xs leading-6 text-muted-foreground">
                    {columns}
                </p>

                {note && (
                    <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                        <AlertCircle className="mt-1 size-4 shrink-0" />
                        <span>{note}</span>
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <FormInput
                    id={`${routeName}-file`}
                    label="Excel / CSV File"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) =>
                        form.setData('file', e.target.files?.[0] ?? null)
                    }
                    error={form.errors.file}
                />

                <p className="text-xs text-muted-foreground">
                    Supported formats: XLSX, XLS, CSV
                </p>

                {form.data.file && (
                    <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FileSpreadsheet className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                                {form.data.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {(form.data.file.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => form.setData('file', null)}
                            disabled={form.processing}
                        >
                            Remove
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    Please verify your file columns before importing.
                </p>

                <Button
                    type="submit"
                    disabled={form.processing || !form.data.file}
                    className="w-full sm:w-auto"
                >
                    {form.processing ? (
                        <>
                            <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                            Importing...
                        </>
                    ) : (
                        <>
                            <Upload className="size-4" />
                            Import Data
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}

function ImportResult({ result }: { result: ImportResultProps }) {
    return (
        <section className="space-y-4 rounded-xl border border-green-200 bg-green-50/60 p-4 dark:border-green-900 dark:bg-green-950/20 sm:p-5">
            <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                    <CheckCircle2 className="size-5 text-green-700 dark:text-green-400" />
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">
                        {result.label} Import Completed
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        The import process has finished. Review the summary below.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-green-200/80 bg-background p-3 dark:border-green-900">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-green-700 dark:text-green-400">
                        {result.created}
                    </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Skipped</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {result.skipped}
                    </p>
                </div>
            </div>

            {result.messages.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Import Details</h4>
                    <ul className="max-h-48 list-disc space-y-1 overflow-y-auto rounded-lg border bg-background p-3 pl-8 text-sm text-muted-foreground">
                        {result.messages.map((message, index) => (
                            <li key={`${index}-${message}`}>{message}</li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

export default function ImportsIndex({ result }: ImportsIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Import Tools" />

            <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <HeadingSmall
                        title="Import Tools"
                        description="পুরনো ডেটা Excel বা CSV ফাইল থেকে বাল্ক ইম্পোর্ট করুন।"
                    />
                    <div className="flex items-center gap-2 self-start rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground sm:self-auto">
                        <FileSpreadsheet className="size-4 text-primary" />
                        Excel & CSV Supported
                    </div>
                </div>

                {result && <ImportResult result={result} />}

                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="border-b p-4 sm:p-5">
                        <h2 className="font-semibold">Choose Import Type</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Select a category, upload your file, and import your data.
                        </p>
                    </div>

                    <Tabs defaultValue="products" className="w-full">
                        <div className="border-b px-4 pt-4 sm:px-5">
                            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted p-1 sm:grid-cols-4">
                                <TabsTrigger value="products" className="gap-2 py-2.5 text-xs sm:text-sm">
                                    <Package className="size-4" />
                                    Products
                                </TabsTrigger>
                                <TabsTrigger value="contacts" className="gap-2 py-2.5 text-xs sm:text-sm">
                                    <Users className="size-4" />
                                    Contacts
                                </TabsTrigger>
                                <TabsTrigger value="opening-stock" className="gap-2 py-2.5 text-xs sm:text-sm">
                                    <Boxes className="size-4" />
                                    <span className="hidden sm:inline">Opening Stock</span>
                                    <span className="sm:hidden">Stock</span>
                                </TabsTrigger>
                                <TabsTrigger value="sales" className="gap-2 py-2.5 text-xs sm:text-sm">
                                    <ShoppingCart className="size-4" />
                                    Sales
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-4 sm:p-5 lg:p-6">
                            <TabsContent value="products" className="mt-0">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">Import Products</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Add multiple products using an Excel or CSV file.
                                    </p>
                                </div>
                                <UploadForm
                                    routeName="imports.products"
                                    columns="name, sku, barcode, category, brand, unit, selling_price, opening_stock, opening_stock_cost, minimum_stock_level, warranty_period_months"
                                    note="SKU আগে থেকে থাকলে সেই row skip হবে। category/unit/brand নাম দিয়ে না থাকলে নতুন তৈরি হয়ে যাবে।"
                                />
                            </TabsContent>

                            <TabsContent value="contacts" className="mt-0">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">Import Contacts</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Import customers, suppliers, or both in bulk.
                                    </p>
                                </div>
                                <UploadForm
                                    routeName="imports.contacts"
                                    columns="name, phone, email, address, type (customer/supplier/both), business_name, opening_balance"
                                    note="একই phone + type-এর contact আগে থেকে থাকলে সেই row skip হবে।"
                                />
                            </TabsContent>

                            <TabsContent value="opening-stock" className="mt-0">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">Import Opening Stock</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Set initial stock quantities and unit costs for existing products.
                                    </p>
                                </div>
                                <UploadForm
                                    routeName="imports.opening-stock"
                                    columns="sku, quantity, unit_cost"
                                    note="Product আগে থেকে থাকতে হবে (sku দিয়ে match), এবং তার কোনো stock movement এখনো না থাকতে হবে।"
                                />
                            </TabsContent>

                            <TabsContent value="sales" className="mt-0">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">Import Historical Sales</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Import past sales records for historical reference.
                                    </p>
                                </div>
                                <UploadForm
                                    routeName="imports.sales"
                                    columns="invoice_no, customer_name, customer_phone, customer_email, sale_date, product_name, sku, quantity, unit_price, item_description, order_total"
                                    note="একই invoice_no-এর একাধিক row একটা Sale-এ গ্রুপ হবে। এই sale-গুলো historical record হিসেবে import হয় — stock/ledger/account-এ কোনো প্রভাব পড়ে না।"
                                />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <p>
                        Ensure your file matches the expected column names and format.
                        Import results will show how many records were created or skipped.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}