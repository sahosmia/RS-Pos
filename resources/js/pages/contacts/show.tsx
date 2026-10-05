import ContactFormModal from '@/components/contacts/contact-form-modal';
import ContactLedgerTable from '@/components/contacts/contact-ledger-table';
import PayDueModal from '@/components/contacts/pay-due-modal';
import RefundCreditModal from '@/components/contacts/refund-credit-modal';
import WaiveDueModal from '@/components/contacts/waive-due-modal';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import { type DataTablePaginationMeta } from '@/components/data-table/types';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import EmptyState from '@/components/shared/empty-state';
import SearchableSelect from '@/components/shared/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format-date';
import { type BreadcrumbItem } from '@/types';
import {
    type Account,
    type ContactDetail,
    type ContactDocument,
    type ContactLedgerEntry,
    type ContactPurchaseSummary,
    type ContactSaleSummary,
    type CustomerGroup,
    type CustomerOption,
} from '@/types/models';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Download, Printer } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface ContactShowProps {
    contact: ContactDetail;
    ledger: ContactLedgerEntry[];
    ledgerFilters: { from: string; to: string };
    ledgerPagination: DataTablePaginationMeta;
    payments: ContactLedgerEntry[];
    documents: ContactDocument[];
    accounts: Account[];
    customerGroups: CustomerGroup[];
    purchases: ContactPurchaseSummary[];
    sales: ContactSaleSummary[];
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function ContactShow({
    contact,
    ledger,
    ledgerFilters,
    ledgerPagination,
    payments,
    documents,
    accounts,
    customerGroups,
    purchases,
    sales,
}: ContactShowProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [waiveModalOpen, setWaiveModalOpen] = useState(false);
    const [refundModalOpen, setRefundModalOpen] = useState(false);
    // A pure customer with a negative balance holds credit (advance / overpayment) we can hand back.
    const canRefund = contact.type === 'customer' && contact.balance < 0;
    const [ledgerFrom, setLedgerFrom] = useState(ledgerFilters.from);
    const [ledgerTo, setLedgerTo] = useState(ledgerFilters.to);

    const applyLedgerFilter = (from: string, to: string, page?: number) => {
        router.get(
            route('contacts.show', contact.id),
            { from, to, ...(page ? { page } : {}) },
            { preserveScroll: true, preserveState: true, only: ['ledger', 'ledgerFilters', 'ledgerPagination', 'payments'] },
        );
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('contactsPage', 'title'), href: '/contacts' },
        { title: contact.display_name, href: `/contacts/${contact.id}` },
    ];

    const documentForm = useForm<{ file: File | null }>({ file: null });

    const uploadDocument: FormEventHandler = (e) => {
        e.preventDefault();

        if (!documentForm.data.file) {
            return;
        }

        documentForm.post(route('contacts.documents.store', contact.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Document uploaded.');
                documentForm.reset();
            },
            onError: () => toast.error('Could not upload document.'),
        });
    };

    const deleteDocument = (documentId: number) => {
        router.delete(route('contacts.documents.destroy', [contact.id, documentId]), {
            preserveScroll: true,
            onSuccess: () => toast.success('Document removed.'),
            onError: () => toast.error('Could not remove document.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={contact.display_name} />

            <div className="space-y-6 px-4 py-6">
                <div className="w-full max-w-xs print:hidden">
                    <SearchableSelect<CustomerOption>
                        value={{
                            id: contact.id,
                            name: contact.name,
                            display_name: contact.display_name,
                            phone: contact.phone,
                            business_name: contact.business_name,
                            balance: contact.balance,
                        }}
                        onChange={(next) => next && next.id !== contact.id && router.visit(route('contacts.show', next.id))}
                        getLabel={(option) => option.display_name}
                        getSublabel={(option) => option.phone ?? ''}
                        searchUrl={route('contacts.search')}
                        placeholder="Switch to another contact"
                    />
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
                    <HeadingSmall
                        title={contact.display_name}
                        description={`${contact.phone}${contact.email ? ' • ' + contact.email : ''}${contact.customer_group ? ' • ' + contact.customer_group.name : ''}`}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={contact.is_active ? 'secondary' : 'outline'}>
                            {contact.is_active ? t('common', 'active') : t('common', 'inactive')}
                        </Badge>
                        <Badge variant="outline">{humanize(contact.type)}</Badge>
                        <Button variant="outline" onClick={() => setPayModalOpen(true)} disabled={accounts.length === 0}>
                            {t('contactShow', 'pay_due')}
                        </Button>
                        <Button variant="outline" onClick={() => setWaiveModalOpen(true)}>
                            {t('contactShow', 'add_discount')}
                        </Button>
                        {canRefund && (
                            <Button variant="outline" onClick={() => setRefundModalOpen(true)} disabled={accounts.length === 0}>
                                {t('contactShow', 'refund')}
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setEditModalOpen(true)}>
                            {t('common', 'edit')}
                        </Button>
                    </div>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">{t('contactShow', 'balance')}</p>
                    <p className="text-2xl font-semibold tabular-nums">{contact.balance_label}</p>
                </div>

                <Tabs defaultValue="ledger">
                    <TabsList className="print:hidden">
                        <TabsTrigger value="ledger">{t('contactShow', 'ledger')}</TabsTrigger>
                        <TabsTrigger value="purchases">{t('contactShow', 'purchases')}</TabsTrigger>
                        <TabsTrigger value="sales">{t('contactShow', 'sales')}</TabsTrigger>
                        <TabsTrigger value="documents">{t('contactShow', 'documents')}</TabsTrigger>
                        <TabsTrigger value="payments">{t('contactShow', 'payments')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="ledger">
                        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 print:hidden">
                            <div className="flex flex-wrap items-end gap-2">
                                <FormInput
                                    id="ledger-from"
                                    label="From"
                                    type="date"
                                    value={ledgerFrom}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setLedgerFrom(val);
                                        if (val && ledgerTo) {
                                            applyLedgerFilter(val, ledgerTo);
                                        }
                                    }}
                                    className="h-9 w-40"
                                />
                                <FormInput
                                    id="ledger-to"
                                    label="To"
                                    type="date"
                                    value={ledgerTo}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setLedgerTo(val);
                                        if (ledgerFrom && val) {
                                            applyLedgerFilter(ledgerFrom, val);
                                        }
                                    }}
                                    className="h-9 w-40"
                                />
                            </div>

                            {ledger.length > 0 && (
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                                        <Printer className="size-4" />
                                        {t('common', 'print')}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Download className="size-4" />
                                                {t('common', 'export')}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={route('contacts.ledger.export', [
                                                        contact.id,
                                                        { format: 'pdf', from: ledgerFrom, to: ledgerTo },
                                                    ])}
                                                >
                                                    PDF
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={route('contacts.ledger.export', [
                                                        contact.id,
                                                        { format: 'xlsx', from: ledgerFrom, to: ledgerTo },
                                                    ])}
                                                >
                                                    Excel
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={route('contacts.ledger.export', [
                                                        contact.id,
                                                        { format: 'csv', from: ledgerFrom, to: ledgerTo },
                                                    ])}
                                                >
                                                    CSV
                                                </a>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>
                        {ledger.length === 0 ? (
                            <EmptyState title={t('contactShow', 'empty_ledger_title')} description={t('contactShow', 'empty_ledger_description')} />
                        ) : (
                            <ContactLedgerTable rows={ledger} />
                        )}
                        {ledgerPagination.last_page > 1 && (
                            <div className="mt-3">
                                <DataTablePagination
                                    pagination={ledgerPagination}
                                    perPage={100}
                                    perPageOptions={[]}
                                    allowAll={false}
                                    onPerPageChange={() => undefined}
                                    onPageChange={(page) => applyLedgerFilter(ledgerFrom, ledgerTo, page)}
                                    itemLabel="entries"
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="purchases">
                        {purchases.length === 0 ? (
                            <EmptyState
                                title={t('contactShow', 'empty_purchases_title')}
                                description={t('contactShow', 'empty_purchases_description')}
                            />
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium">{t('common', 'invoice')}</th>
                                            <th className="px-4 py-2 text-left font-medium">{t('common', 'date')}</th>
                                            <th className="px-4 py-2 text-right font-medium">{t('common', 'total')}</th>
                                            <th className="px-4 py-2 text-right font-medium">{t('common', 'due')}</th>
                                            <th className="px-4 py-2 text-left font-medium">{t('common', 'status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchases.map((purchase) => (
                                            <tr key={purchase.id} className="border-t">
                                                <td className="px-4 py-2">
                                                    <Link href={route('purchases.show', purchase.id)} className="underline-offset-2 hover:underline">
                                                        {purchase.invoice_no}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">{formatDate(purchase.purchase_date)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">{money(purchase.total_amount)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">{money(purchase.due_amount)}</td>
                                                <td className="px-4 py-2">
                                                    <Badge variant="outline">{humanize(purchase.status)}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="sales">
                        {sales.length === 0 ? (
                            <EmptyState title={t('contactShow', 'empty_sales_title')} description={t('contactShow', 'empty_sales_description')} />
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium">{t('common', 'invoice')}</th>
                                            <th className="px-4 py-2 text-left font-medium">{t('common', 'date')}</th>
                                            <th className="px-4 py-2 text-right font-medium">{t('common', 'total')}</th>
                                            <th className="px-4 py-2 text-right font-medium">{t('common', 'due')}</th>
                                            <th className="px-4 py-2 text-left font-medium">{t('common', 'status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.map((sale) => (
                                            <tr key={sale.id} className="border-t">
                                                <td className="px-4 py-2">
                                                    <Link href={route('sales.show', sale.id)} className="underline-offset-2 hover:underline">
                                                        {sale.invoice_no}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">{formatDate(sale.sale_date)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">{money(sale.total_amount)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">{money(sale.due_amount)}</td>
                                                <td className="px-4 py-2">
                                                    <Badge variant="outline">{humanize(sale.status)}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-4">
                        <form onSubmit={uploadDocument} className="flex items-end gap-2">
                            <div className="grid min-w-0 content-start gap-2">
                                <Input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    onChange={(e) => documentForm.setData('file', e.target.files?.[0] ?? null)}
                                />
                                <InputError message={documentForm.errors.file} />
                            </div>
                            <Button type="submit" disabled={documentForm.processing || !documentForm.data.file}>
                                {documentForm.processing ? t('common', 'uploading') : t('common', 'upload')}
                            </Button>
                        </form>

                        {documents.length === 0 ? (
                            <EmptyState
                                title={t('contactShow', 'empty_documents_title')}
                                description={t('contactShow', 'empty_documents_description')}
                            />
                        ) : (
                            <div className="divide-y rounded-lg border">
                                {documents.map((document) => (
                                    <div key={document.id} className="flex items-center justify-between px-4 py-2">
                                        <a href={document.url} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-2">
                                            {document.name}
                                        </a>
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground text-xs">{formatDate(document.created_at)}</span>
                                            <Button variant="ghost" size="sm" onClick={() => deleteDocument(document.id)}>
                                                {t('common', 'delete')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="payments">
                        {payments.length === 0 ? (
                            <EmptyState
                                title={t('contactShow', 'empty_payments_title')}
                                description={t('contactShow', 'empty_payments_description')}
                            />
                        ) : (
                            <ContactLedgerTable rows={payments} />
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <ContactFormModal
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                editing={contact}
                customerGroups={customerGroups}
                onSuccess={() => router.reload()}
            />

            <PayDueModal
                open={payModalOpen}
                onOpenChange={setPayModalOpen}
                contact={contact}
                accounts={accounts}
                sales={sales}
                purchases={purchases}
            />

            <WaiveDueModal open={waiveModalOpen} onOpenChange={setWaiveModalOpen} contact={contact} />

            <RefundCreditModal open={refundModalOpen} onOpenChange={setRefundModalOpen} contact={contact} accounts={accounts} />
        </AppLayout>
    );
}
