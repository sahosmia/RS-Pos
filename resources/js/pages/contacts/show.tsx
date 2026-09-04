import ContactFormModal from '@/components/contacts/contact-form-modal';
import PayDueModal from '@/components/contacts/pay-due-modal';
import WaiveDueModal from '@/components/contacts/waive-due-modal';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import EmptyState from '@/components/shared/empty-state';
import LedgerTable, { type LedgerRow } from '@/components/shared/ledger-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type Account,
    type ContactDetail,
    type ContactDocument,
    type ContactLedgerEntry,
    type ContactPurchaseSummary,
    type ContactSaleSummary,
    type CustomerGroup,
} from '@/types/models';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface ContactShowProps {
    contact: ContactDetail;
    ledger: ContactLedgerEntry[];
    payments: ContactLedgerEntry[];
    documents: ContactDocument[];
    accounts: Account[];
    customerGroups: CustomerGroup[];
    purchases: ContactPurchaseSummary[];
    sales: ContactSaleSummary[];
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const toRows = (entries: ContactLedgerEntry[]): LedgerRow[] =>
    entries.map((entry) => ({
        id: entry.id,
        date: entry.created_at,
        description: entry.note ? `${humanize(entry.type)} — ${entry.note}` : humanize(entry.type),
        amount: entry.amount,
        balance: entry.balance,
    }));

export default function ContactShow({ contact, ledger, payments, documents, accounts, customerGroups, purchases, sales }: ContactShowProps) {
    const money = useMoneyFormat();
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [waiveModalOpen, setWaiveModalOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Contacts', href: '/contacts' },
        { title: contact.name, href: `/contacts/${contact.id}` },
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
            onSuccess: () => documentForm.reset(),
        });
    };

    const deleteDocument = (documentId: number) => {
        router.delete(route('contacts.documents.destroy', [contact.id, documentId]), { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={contact.name} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall
                        title={contact.name}
                        description={`${contact.phone}${contact.email ? ' • ' + contact.email : ''}${contact.customer_group ? ' • ' + contact.customer_group.name : ''}`}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={contact.is_active ? 'secondary' : 'outline'}>{contact.is_active ? 'Active' : 'Inactive'}</Badge>
                        <Badge variant="outline">{humanize(contact.type)}</Badge>
                        <Button variant="outline" onClick={() => setPayModalOpen(true)} disabled={accounts.length === 0}>
                            Pay Due Amount
                        </Button>
                        <Button variant="outline" onClick={() => setWaiveModalOpen(true)}>
                            Add Discount
                        </Button>
                        <Button variant="outline" onClick={() => setEditModalOpen(true)}>
                            Edit
                        </Button>
                    </div>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Balance</p>
                    <p className="text-2xl font-semibold tabular-nums">{contact.balance_label}</p>
                </div>

                <Tabs defaultValue="ledger">
                    <TabsList>
                        <TabsTrigger value="ledger">Ledger</TabsTrigger>
                        <TabsTrigger value="purchases">Purchases</TabsTrigger>
                        <TabsTrigger value="sales">Sales</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="ledger">
                        {ledger.length === 0 ? (
                            <EmptyState title="No ledger entries yet" description="Opening balance বা প্রথম লেনদেন এখানে দেখাবে" />
                        ) : (
                            <LedgerTable rows={toRows(ledger)} />
                        )}
                    </TabsContent>

                    <TabsContent value="purchases">
                        {purchases.length === 0 ? (
                            <EmptyState title="No purchases yet" description="এই supplier থেকে এখনো কিছু কেনা হয়নি" />
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium">Invoice</th>
                                            <th className="px-4 py-2 text-left font-medium">Date</th>
                                            <th className="px-4 py-2 text-right font-medium">Total</th>
                                            <th className="px-4 py-2 text-right font-medium">Due</th>
                                            <th className="px-4 py-2 text-left font-medium">Status</th>
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
                                                <td className="px-4 py-2 whitespace-nowrap">{purchase.purchase_date}</td>
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
                            <EmptyState title="No sales yet" description="এই customer-এর কাছে এখনো কিছু বিক্রি হয়নি" />
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium">Invoice</th>
                                            <th className="px-4 py-2 text-left font-medium">Date</th>
                                            <th className="px-4 py-2 text-right font-medium">Total</th>
                                            <th className="px-4 py-2 text-right font-medium">Due</th>
                                            <th className="px-4 py-2 text-left font-medium">Status</th>
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
                                                <td className="px-4 py-2 whitespace-nowrap">{sale.sale_date}</td>
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
                            <div className="grid gap-2">
                                <Input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    onChange={(e) => documentForm.setData('file', e.target.files?.[0] ?? null)}
                                />
                                <InputError message={documentForm.errors.file} />
                            </div>
                            <Button type="submit" disabled={documentForm.processing || !documentForm.data.file}>
                                {documentForm.processing ? 'Uploading...' : 'Upload'}
                            </Button>
                        </form>

                        {documents.length === 0 ? (
                            <EmptyState title="No documents yet" description="ID copy, agreement ইত্যাদি এখানে যোগ করুন" />
                        ) : (
                            <div className="divide-y rounded-lg border">
                                {documents.map((document) => (
                                    <div key={document.id} className="flex items-center justify-between px-4 py-2">
                                        <a href={document.url} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-2">
                                            {document.name}
                                        </a>
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground text-xs">{document.created_at}</span>
                                            <Button variant="ghost" size="sm" onClick={() => deleteDocument(document.id)}>
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="payments">
                        {payments.length === 0 ? (
                            <EmptyState title="No payments yet" description="Pay Due Amount দিয়ে প্রথম পেমেন্ট রেকর্ড করুন" />
                        ) : (
                            <LedgerTable rows={toRows(payments)} />
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

            <PayDueModal open={payModalOpen} onOpenChange={setPayModalOpen} contact={contact} accounts={accounts} />

            <WaiveDueModal open={waiveModalOpen} onOpenChange={setWaiveModalOpen} contact={contact} />
        </AppLayout>
    );
}
