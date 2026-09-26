import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Import Tools', href: '/imports' }];

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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!form.data.file) {
            return;
        }

        form.post(route(routeName), { forceFormData: true, onSuccess: () => form.reset() });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Expected columns</p>
                <p className="text-muted-foreground">{columns}</p>
                {note && <p className="text-muted-foreground mt-1">{note}</p>}
            </div>

            <FormInput
                id={`${routeName}-file`}
                label="Excel/CSV file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)}
                error={form.errors.file}
            />

            <Button type="submit" disabled={form.processing || !form.data.file}>
                {form.processing ? 'Importing...' : 'Import'}
            </Button>
        </form>
    );
}

export default function ImportsIndex({ result }: ImportsIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Import Tools" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Import Tools" description="পুরনো ডেটা এক্সেল/সিএসভি থেকে বাল্ক ইম্পোর্ট করুন" />

                {result && (
                    <div className="space-y-2 rounded-lg border p-4">
                        <p className="font-medium">
                            {result.label}: {result.created} created, {result.skipped} skipped
                        </p>
                        {result.messages.length > 0 && (
                            <ul className="text-muted-foreground max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
                                {result.messages.map((message, index) => (
                                    <li key={index}>{message}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <Tabs defaultValue="products" className="w-full">
                    <TabsList>
                        <TabsTrigger value="products">Products</TabsTrigger>
                        <TabsTrigger value="contacts">Contacts</TabsTrigger>
                        <TabsTrigger value="opening-stock">Opening Stock</TabsTrigger>
                        <TabsTrigger value="sales">Sales</TabsTrigger>
                    </TabsList>

                    <TabsContent value="products">
                        <UploadForm
                            routeName="imports.products"
                            columns="name, sku, barcode, category, brand, unit, selling_price, opening_stock, opening_stock_cost, minimum_stock_level, warranty_period_months"
                            note="SKU আগে থেকে থাকলে সেই row skip হবে। category/unit/brand নাম দিয়ে না থাকলে নতুন তৈরি হয়ে যাবে।"
                        />
                    </TabsContent>

                    <TabsContent value="contacts">
                        <UploadForm
                            routeName="imports.contacts"
                            columns="name, phone, email, address, type (customer/supplier/both), business_name, opening_balance"
                            note="একই phone + type-এর contact আগে থেকে থাকলে সেই row skip হবে।"
                        />
                    </TabsContent>

                    <TabsContent value="opening-stock">
                        <UploadForm
                            routeName="imports.opening-stock"
                            columns="sku, quantity, unit_cost"
                            note="Product আগে থেকে থাকতে হবে (sku দিয়ে match), এবং তার কোনো stock movement এখনো না থাকতে হবে।"
                        />
                    </TabsContent>

                    <TabsContent value="sales">
                        <UploadForm
                            routeName="imports.sales"
                            columns="invoice_no, customer_name, customer_phone, customer_email, sale_date, product_name, sku, quantity, unit_price, item_description, order_total"
                            note="একই invoice_no-এর একাধিক row একটা Sale-এ গ্রুপ হবে। এই sale-গুলো historical record হিসেবে import হয় — stock/ledger/account-এ কোনো প্রভাব পড়ে না।"
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
