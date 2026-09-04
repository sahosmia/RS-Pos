import ContactFormModal from '@/components/contacts/contact-form-modal';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type ContactListItem, type ContactType, type CustomerGroup, type Paginated } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Contacts', href: '/contacts' }];

interface ContactsIndexProps {
    contacts: Paginated<ContactListItem>;
    customerGroups: CustomerGroup[];
    filters: {
        search: string | null;
        type: ContactType | null;
        customer_group_id: number | null;
    };
}

const typeLabel: Record<ContactType, string> = {
    customer: 'Customer',
    supplier: 'Supplier',
    both: 'Both',
};

export default function ContactsIndex({ contacts, customerGroups, filters }: ContactsIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editing, setEditing] = useState<ContactListItem | null>(null);
    const [deleting, setDeleting] = useState<ContactListItem | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    const applyFilters = (next: Partial<ContactsIndexProps['filters']>) => {
        router.get(
            route('contacts.index'),
            {
                search: next.search !== undefined ? next.search : filters.search,
                type: next.type !== undefined ? next.type : filters.type,
                customer_group_id: next.customer_group_id !== undefined ? next.customer_group_id : filters.customer_group_id,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search: search || null });
    };

    const openCreate = () => {
        setEditing(null);
        setFormModalOpen(true);
    };

    const openEdit = (contact: ContactListItem) => {
        setEditing(contact);
        setFormModalOpen(true);
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('contacts.destroy', deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    const toggleSelected = (id: number, checked: boolean) => {
        setSelected((current) => (checked ? [...current, id] : current.filter((selectedId) => selectedId !== id)));
    };

    const toggleSelectAll = (checked: boolean) => {
        setSelected(checked ? contacts.data.map((contact) => contact.id) : []);
    };

    const exportSelected = () => {
        const params = new URLSearchParams();
        selected.forEach((id) => params.append('ids[]', String(id)));
        window.location.href = `${route('contacts.export')}?${params.toString()}`;
    };

    const confirmBulkDelete = () => {
        router.post(
            route('contacts.bulk-delete'),
            { ids: selected },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBulkDeleteOpen(false);
                    setSelected([]);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contacts" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Contacts" description="Customer ও Supplier — একই তালিকা, type দিয়ে ফিল্টার করুন" />
                    <Button onClick={openCreate}>Add Contact</Button>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <form onSubmit={submitSearch} className="flex items-end gap-2">
                        <Input placeholder="Name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
                        <Button type="submit" variant="outline">
                            Search
                        </Button>
                    </form>

                    <Select
                        value={filters.type ?? 'all'}
                        onValueChange={(value) => applyFilters({ type: value === 'all' ? null : (value as ContactType) })}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="supplier">Supplier</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.customer_group_id ? String(filters.customer_group_id) : 'all'}
                        onValueChange={(value) => applyFilters({ customer_group_id: value === 'all' ? null : Number(value) })}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Customer Group" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All groups</SelectItem>
                            {customerGroups.map((group) => (
                                <SelectItem key={group.id} value={String(group.id)}>
                                    {group.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selected.length > 0 && (
                    <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
                        <p className="text-sm">{selected.length} selected</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={exportSelected}>
                                Export
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                                Delete
                            </Button>
                        </div>
                    </div>
                )}

                {contacts.data.length === 0 ? (
                    <EmptyState title="No contacts yet" description="প্রথম customer বা supplier যোগ করুন">
                        <Button className="mt-2" onClick={openCreate}>
                            Add Contact
                        </Button>
                    </EmptyState>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="w-10 px-4 py-2">
                                            <Checkbox
                                                checked={selected.length === contacts.data.length}
                                                onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                                            />
                                        </th>
                                        <th className="px-4 py-2 text-left font-medium">Name</th>
                                        <th className="px-4 py-2 text-left font-medium">Contact</th>
                                        <th className="px-4 py-2 text-left font-medium">Type</th>
                                        <th className="px-4 py-2 text-right font-medium">Balance</th>
                                        <th className="px-4 py-2 text-left font-medium">Status</th>
                                        <th className="px-4 py-2 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.data.map((contact) => (
                                        <tr key={contact.id} className="border-t">
                                            <td className="px-4 py-2">
                                                <Checkbox
                                                    checked={selected.includes(contact.id)}
                                                    onCheckedChange={(checked) => toggleSelected(contact.id, checked === true)}
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <Link
                                                    href={route('contacts.show', contact.id)}
                                                    className="font-medium underline-offset-2 hover:underline"
                                                >
                                                    {contact.name}
                                                </Link>
                                                {contact.business_name && (
                                                    <div className="text-muted-foreground text-xs">{contact.business_name}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div>{contact.phone}</div>
                                                {contact.email && <div className="text-muted-foreground text-xs">{contact.email}</div>}
                                            </td>
                                            <td className="px-4 py-2">
                                                <Badge variant="outline">{typeLabel[contact.type]}</Badge>
                                                {contact.customer_group && (
                                                    <div className="text-muted-foreground mt-1 text-xs">{contact.customer_group.name}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">{contact.balance_label}</td>
                                            <td className="px-4 py-2">
                                                <Badge variant={contact.is_active ? 'secondary' : 'outline'}>
                                                    {contact.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={route('contacts.show', contact.id)}>View</Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => openEdit(contact)}>
                                                        Edit
                                                    </Button>
                                                    {contact.can_delete && (
                                                        <Button variant="ghost" size="sm" onClick={() => setDeleting(contact)}>
                                                            Delete
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {contacts.last_page > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">
                                    Page {contacts.current_page} of {contacts.last_page} · {contacts.total} contacts
                                </p>
                                <div className="flex gap-2">
                                    {contacts.prev_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={contacts.prev_page_url} preserveScroll preserveState>
                                                Previous
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Previous
                                        </Button>
                                    )}

                                    {contacts.next_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={contacts.next_page_url} preserveScroll preserveState>
                                                Next
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Next
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ContactFormModal open={formModalOpen} onOpenChange={setFormModalOpen} editing={editing} customerGroups={customerGroups} />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete contact?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। ledger history থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />

            <ConfirmDialog
                open={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                title={`Delete ${selected.length} contact(s)?`}
                description="ledger history আছে এমন contact বাদ দিয়ে বাকিগুলো মুছে ফেলা হবে।"
                confirmLabel="Delete"
                onConfirm={confirmBulkDelete}
            />
        </AppLayout>
    );
}
