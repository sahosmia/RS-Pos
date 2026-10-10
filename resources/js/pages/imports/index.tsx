import HeadingSmall from '@/components/heading-small';
import { FileDropzone } from '@/components/shared/file-dropzone';
import { MetricCard, MetricGrid } from '@/components/shared/metric-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Boxes,
    CheckCircle2,
    CircleAlert,
    Download,
    FileSpreadsheet,
    Info,
    Package,
    ScanSearch,
    ShoppingCart,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { useState, type FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Import Tools', href: '/imports' }];

type ImportType = 'products' | 'contacts' | 'opening-stock' | 'sales';
type Requirement = 'required' | 'optional' | 'conditional';

interface ImportColumn {
    name: string;
    requirement: Requirement;
    description: string;
    example: string;
}

interface ImportSchema {
    label: string;
    columns: ImportColumn[];
    any_of: string[][];
}

/** One row (or invoice) of the file: what value went into which field, and whether it is / would be imported. */
interface ImportRow {
    where: string;
    status: 'created' | 'skipped';
    values: Record<string, string>;
    reason: string | null;
}

interface ImportResultProps {
    type: ImportType;
    label: string;
    created: number;
    skipped: number;
    messages: string[];
    rows: ImportRow[];
    rows_truncated: boolean;
}

/** A file that has been read but not imported yet. */
interface ImportPreviewProps extends ImportResultProps {
    type: ImportType;
    token: string;
    filename: string;
}

interface ImportsIndexProps {
    result: ImportResultProps | null;
    preview: ImportPreviewProps | null;
    schemas: Record<ImportType, ImportSchema>;
}

interface TabConfig {
    type: ImportType;
    routeName: string;
    icon: LucideIcon;
    tabLabel: string;
    title: string;
    description: string;
    note: string;
}

const TABS: TabConfig[] = [
    {
        type: 'products',
        routeName: 'imports.products',
        icon: Package,
        tabLabel: 'Products',
        title: 'Import Products',
        description: 'Add multiple products using an Excel or CSV file.',
        note: 'SKU আগে থেকে থাকলে সেই row skip হবে। category/unit/brand নাম দিয়ে না থাকলে নতুন তৈরি হয়ে যাবে।',
    },
    {
        type: 'contacts',
        routeName: 'imports.contacts',
        icon: Users,
        tabLabel: 'Contacts',
        title: 'Import Contacts',
        description: 'Import customers, suppliers, or both in bulk.',
        note: 'একই phone + type-এর contact আগে থেকে থাকলে সেই row skip হবে।',
    },
    {
        type: 'opening-stock',
        routeName: 'imports.opening-stock',
        icon: Boxes,
        tabLabel: 'Opening Stock',
        title: 'Import Opening Stock',
        description: 'Set initial stock quantities and unit costs for existing products.',
        note: 'Product আগে থেকে থাকতে হবে (sku দিয়ে match), এবং তার কোনো stock movement এখনো না থাকতে হবে।',
    },
    {
        type: 'sales',
        routeName: 'imports.sales',
        icon: ShoppingCart,
        tabLabel: 'Sales',
        title: 'Import Sales',
        description: 'Import past sales as records, or live sales that take stock and record the payment.',
        note: 'একই invoice_no-এর একাধিক row একটা Sale-এ গ্রুপ হবে। ডিফল্টে (historical = yes) sale-গুলো শুধু record হিসেবে যায় — stock/ledger/account-এ কোনো প্রভাব পড়ে না। historical = no দিলে live sale হয়: stock কমে, paid_amount ও payment_account অনুযায়ী টাকা account-এ ঢোকে, বাকিটা customer-এর বকেয়া হয়। Discount, installation ও warranty প্রতিটা column-এ দেওয়া যায়।',
    },
];

const REQUIREMENT_BADGE: Record<Requirement, { label: string; variant: 'primary' | 'neutral' | 'warning' }> = {
    required: { label: 'Required', variant: 'primary' },
    optional: { label: 'Optional', variant: 'neutral' },
    conditional: { label: 'One of', variant: 'warning' },
};

/** Which columns the file needs, and which it may leave out — the table people check before uploading. */
function ColumnsTable({ schema }: { schema: ImportSchema }) {
    const required = schema.columns.filter((column) => column.requirement === 'required').length;
    const optional = schema.columns.filter((column) => column.requirement === 'optional').length;
    const conditional = schema.columns.filter((column) => column.requirement === 'conditional').length;

    return (
        <section aria-labelledby={`columns-${schema.label}`} className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h4 id={`columns-${schema.label}`} className="text-sm font-semibold">
                    File columns
                </h4>
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="primary">{required} required</Badge>
                    {conditional > 0 && <Badge variant="warning">{conditional} one of</Badge>}
                    <Badge variant="neutral">{optional} optional</Badge>
                </div>
            </div>

            <p className="text-muted-foreground text-[0.8125rem] leading-5">
                The first row of your file must contain these column names exactly as written. The order of columns doesn&apos;t matter, and optional
                columns can be left out.
                {schema.any_of.map((group) => (
                    <span key={group.join('-')} className="text-foreground font-medium">
                        {' '}
                        At least one of {group.join(' / ')} is needed.
                    </span>
                ))}
            </p>

            <div className="rounded-brand-control border-brand-control-border overflow-x-auto border">
                <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
                    <thead>
                        <tr className="bg-brand-table-header text-muted-foreground text-xs font-semibold tracking-wide">
                            <th scope="col" className="border-brand-table-divider w-10 border-b px-3.5 py-2.5 text-left">
                                #
                            </th>
                            <th scope="col" className="border-brand-table-divider border-b px-3.5 py-2.5 text-left">
                                Column
                            </th>
                            <th scope="col" className="border-brand-table-divider border-b px-3.5 py-2.5 text-left">
                                Required?
                            </th>
                            <th scope="col" className="border-brand-table-divider border-b px-3.5 py-2.5 text-left">
                                What to enter
                            </th>
                            <th scope="col" className="border-brand-table-divider border-b px-3.5 py-2.5 text-left">
                                Example
                            </th>
                        </tr>
                    </thead>
                    <tbody className="[&>tr:last-child>td]:border-b-0">
                        {schema.columns.map((column, index) => {
                            const badge = REQUIREMENT_BADGE[column.requirement];

                            return (
                                <tr
                                    key={column.name}
                                    className={cn(
                                        'hover:bg-brand-table-row-hover motion-colors',
                                        column.requirement === 'required' && 'bg-brand-primary/[0.03]',
                                    )}
                                >
                                    <td className="border-brand-table-divider text-muted-foreground border-b px-3.5 py-2.5 tabular-nums">
                                        {index + 1}
                                    </td>
                                    <td className="border-brand-table-divider border-b px-3.5 py-2.5 font-mono text-[0.8125rem] font-medium whitespace-nowrap">
                                        {column.name}
                                    </td>
                                    <td className="border-brand-table-divider border-b px-3.5 py-2.5">
                                        <Badge variant={badge.variant} size="sm">
                                            {badge.label}
                                        </Badge>
                                    </td>
                                    <td className="border-brand-table-divider text-muted-foreground border-b px-3.5 py-2.5">{column.description}</td>
                                    <td className="border-brand-table-divider border-b px-3.5 py-2.5 font-mono text-xs whitespace-nowrap">
                                        {column.example || <span className="text-muted-foreground">—</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function UploadForm({ tab }: { tab: TabConfig }) {
    const form = useForm<{ file: File | null }>({ file: null });

    const submit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();

        if (!form.data.file || form.processing) {
            return;
        }

        form.post(route('imports.preview', tab.type), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <FileDropzone
                id={`${tab.type}-file`}
                label="Excel / CSV file"
                accept=".xlsx,.xls,.csv"
                maxSizeMb={10}
                file={form.data.file}
                onFileChange={(file) => {
                    form.clearErrors('file');
                    form.setData('file', file);
                }}
                error={form.errors.file}
                disabled={form.processing}
                required
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-xs">
                    You will see every row and what would go into each field first. Nothing is saved until you confirm.
                </p>
                <Button type="submit" variant="primary" disabled={!form.data.file} loading={form.processing} className="w-full sm:w-auto">
                    <ScanSearch />
                    Check file
                </Button>
            </div>
        </form>
    );
}

/** "Row 5: SKU already exists" → { where: "Row 5", reason: "SKU already exists" }. Unmatched text is shown as-is. */
function splitMessage(message: string): { where: string; reason: string } {
    const match = message.match(/^(Row \d+|Invoice "[^"]*"):\s*(.*)$/);

    return match ? { where: match[1], reason: match[2] } : { where: '—', reason: message };
}

/** "unit_cost" → keep the file's own column names, shown in the order the template lists them. */
function orderedFields(rows: ImportRow[], schema: ImportSchema | undefined): string[] {
    const present = new Set(rows.flatMap((row) => Object.keys(row.values)));
    const known = (schema?.columns ?? []).map((column) => column.name).filter((name) => present.has(name));
    const extra = [...present].filter((name) => !known.includes(name));

    return [...known, ...extra];
}

/** Every row of the file as a table: its number, whether it is imported or skipped, then one column per field. */
function RowsTable({ rows, schema, truncated, total }: { rows: ImportRow[]; schema: ImportSchema | undefined; truncated: boolean; total: number }) {
    const fields = orderedFields(rows, schema);

    return (
        <div className="space-y-2">
            <div className="rounded-brand-control border-brand-control-border max-h-[28rem] overflow-auto border">
                <table className="w-full border-separate border-spacing-0 text-sm">
                    <thead>
                        <tr className="bg-brand-table-header text-muted-foreground sticky top-0 z-10 text-xs font-semibold tracking-wide">
                            <th scope="col" className="border-brand-table-divider border-b px-3 py-2.5 text-left whitespace-nowrap">
                                Row
                            </th>
                            <th scope="col" className="border-brand-table-divider border-b px-3 py-2.5 text-left">
                                Result
                            </th>
                            {fields.map((field) => (
                                <th
                                    key={field}
                                    scope="col"
                                    className="border-brand-table-divider border-b px-3 py-2.5 text-left font-mono whitespace-nowrap"
                                >
                                    {field}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const skipped = row.status === 'skipped';

                            return (
                                <tr key={`${row.where}-${index}`} className={cn('align-top', skipped && 'bg-brand-danger/[0.05]')}>
                                    <td className="border-brand-table-divider border-b px-3 py-2 font-mono text-[0.8125rem] whitespace-nowrap">
                                        {row.where}
                                    </td>
                                    <td className="border-brand-table-divider min-w-44 border-b px-3 py-2">
                                        {skipped ? (
                                            <div className="space-y-1">
                                                <Badge variant="destructive" size="sm">
                                                    Skipped
                                                </Badge>
                                                <p className="text-brand-danger-text text-xs break-words">
                                                    {row.reason?.replace(/^(Row \d+|Invoice "[^"]*"):\s*/, '')}
                                                </p>
                                            </div>
                                        ) : (
                                            <Badge variant="success" size="sm">
                                                OK
                                            </Badge>
                                        )}
                                    </td>
                                    {fields.map((field) => (
                                        <td key={field} className="border-brand-table-divider border-b px-3 py-2 break-words">
                                            {row.values[field] ?? <span className="text-muted-foreground">—</span>}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {truncated && (
                <p className="text-muted-foreground text-xs">
                    Showing the first {rows.length} of {total} rows. The counts above cover the whole file.
                </p>
            )}
        </div>
    );
}

/** Step 2: what the file would do, row by row. Nothing is saved until "Import" is pressed. */
function ImportPreview({ preview, schema }: { preview: ImportPreviewProps; schema: ImportSchema | undefined }) {
    const [working, setWorking] = useState(false);
    const hasProblems = preview.skipped > 0;

    const confirm = () => {
        setWorking(true);
        router.post(route('imports.confirm', preview.type), { token: preview.token }, { preserveScroll: true, onFinish: () => setWorking(false) });
    };

    const cancel = () => {
        setWorking(true);
        router.delete(route('imports.preview.discard', preview.token), { preserveScroll: true, onFinish: () => setWorking(false) });
    };

    return (
        <section aria-label={`${preview.label} import preview`} className="space-y-4">
            <Alert variant="info" icon={<ScanSearch />} title={`Check before importing: ${preview.filename}`}>
                <AlertDescription>
                    Nothing has been saved yet.{' '}
                    {hasProblems
                        ? 'Rows marked Skipped will not be imported (the reason is shown). You can import the rest now, or cancel, fix the file and upload it again.'
                        : 'Every row looks fine. Check the values under each field, then import.'}
                </AlertDescription>
            </Alert>

            <MetricGrid columns={2}>
                <MetricCard label="Will be imported" value={preview.created} icon={CheckCircle2} accent="success" />
                <MetricCard label="Will be skipped" value={preview.skipped} icon={CircleAlert} accent={hasProblems ? 'warning' : 'neutral'} />
            </MetricGrid>

            <RowsTable rows={preview.rows} schema={schema} truncated={preview.rows_truncated} total={preview.created + preview.skipped} />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={cancel} disabled={working}>
                    Cancel
                </Button>
                <Button type="button" variant="primary" onClick={confirm} disabled={preview.created === 0} loading={working}>
                    Import {preview.created} {preview.created === 1 ? 'row' : 'rows'}
                </Button>
            </div>
        </section>
    );
}
function ImportResult({ result, schema }: { result: ImportResultProps; schema: ImportSchema | undefined }) {
    const hasProblems = result.skipped > 0;

    return (
        <section aria-label={`${result.label} import result`} className="space-y-4">
            <Alert
                variant={hasProblems ? 'warning' : 'success'}
                icon={hasProblems ? <CircleAlert /> : <CheckCircle2 />}
                title={hasProblems ? `${result.label} import finished with ${result.skipped} skipped` : `${result.label} import completed`}
            >
                <AlertDescription>
                    {hasProblems
                        ? 'Fix the rows listed below in your file and import it again. Rows that were created will be skipped as duplicates.'
                        : 'Every row was imported.'}
                </AlertDescription>
            </Alert>

            <MetricGrid columns={2}>
                <MetricCard label="Created" value={result.created} icon={CheckCircle2} accent="success" />
                <MetricCard label="Skipped" value={result.skipped} icon={CircleAlert} accent={hasProblems ? 'warning' : 'neutral'} />
            </MetricGrid>

            {result.rows.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold">What was imported, field by field</h4>
                    <RowsTable rows={result.rows} schema={schema} truncated={result.rows_truncated} total={result.created + result.skipped} />
                </div>
            )}

            {result.messages.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold">{hasProblems ? 'What needs attention' : 'Notes'}</h4>
                    <div className="rounded-brand-control border-brand-control-border max-h-80 overflow-auto border">
                        <table className="w-full min-w-[28rem] border-separate border-spacing-0 text-sm">
                            <thead>
                                <tr className="bg-brand-table-header text-muted-foreground sticky top-0 text-xs font-semibold tracking-wide">
                                    <th scope="col" className="border-brand-table-divider w-36 border-b px-3.5 py-2.5 text-left">
                                        Where
                                    </th>
                                    <th scope="col" className="border-brand-table-divider border-b px-3.5 py-2.5 text-left">
                                        Problem
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="[&>tr:last-child>td]:border-b-0">
                                {result.messages.map((message, index) => {
                                    const { where, reason } = splitMessage(message);

                                    return (
                                        <tr key={`${index}-${message}`} className="hover:bg-brand-table-row-hover motion-colors">
                                            <td className="border-brand-table-divider border-b px-3.5 py-2.5 font-mono text-[0.8125rem] whitespace-nowrap">
                                                {where}
                                            </td>
                                            <td className="border-brand-table-divider border-b px-3.5 py-2.5 break-words">{reason}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

export default function ImportsIndex({ result, preview, schemas }: ImportsIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Import Tools" />

            <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <HeadingSmall title="Import Tools" description="পুরনো ডেটা Excel বা CSV ফাইল থেকে বাল্ক ইম্পোর্ট করুন।" />
                    <Badge variant="neutral" size="lg" icon={<FileSpreadsheet />} className="self-start sm:self-auto">
                        Excel &amp; CSV supported
                    </Badge>
                </div>

                {preview && <ImportPreview preview={preview} schema={schemas[preview.type]} />}
                {result && !preview && <ImportResult result={result} schema={schemas[result.type]} />}

                <div className="rounded-brand-card border-brand-card-border bg-card overflow-hidden border shadow-[var(--brand-card-shadow)]">
                    <Tabs defaultValue={preview?.type ?? 'products'} className="w-full">
                        <div className="border-brand-card-border border-b px-4 pt-2 sm:px-5">
                            <TabsList variant="underline" className="border-b-0">
                                {TABS.map((tab) => (
                                    <TabsTrigger key={tab.type} value={tab.type} icon={<tab.icon />}>
                                        {tab.tabLabel}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        {TABS.map((tab) => (
                            <TabsContent key={tab.type} value={tab.type} className="mt-0 space-y-6 p-4 sm:p-5 lg:p-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="text-lg leading-snug font-semibold">{tab.title}</h3>
                                        <p className="text-muted-foreground mt-1 text-sm">{tab.description}</p>
                                    </div>
                                    <Button asChild variant="outline" className="shrink-0 self-start">
                                        <a href={route('imports.template', tab.type)} download>
                                            <Download />
                                            Download template
                                        </a>
                                    </Button>
                                </div>

                                <UploadForm tab={tab} />

                                <div className="border-brand-card-border space-y-6 border-t pt-6">
                                    <ColumnsTable schema={schemas[tab.type]} />

                                    <Alert variant="info" icon={<Info />}>
                                        <AlertDescription>{tab.note}</AlertDescription>
                                    </Alert>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
