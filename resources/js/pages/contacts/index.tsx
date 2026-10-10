import { ContactBulkBar } from '@/components/contacts/contact-bulk-bar';
import { ContactFilters } from '@/components/contacts/contact-filters';
import ContactFormModal from '@/components/contacts/contact-form-modal';
import { ContactGridCard } from '@/components/contacts/contact-grid-card';
import ContactStatCards, { type ContactStats } from '@/components/contacts/contact-stat-cards';
import { CONTACT_EXPORT_COLUMN_MAP, CONTACT_EXPORT_COLUMNS, CONTACT_VISIBILITY_COLUMNS } from '@/components/contacts/contact-table-config';
import PayDueModal from '@/components/contacts/pay-due-modal';
import SendNotificationModal from '@/components/contacts/send-notification-modal';
import { type RowAction } from '@/components/data-table/data-table-row-actions';
import ListTable from '@/components/data-table/list-table';
import { AddButton } from '@/components/shared/action-buttons';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useConfirmDelete } from '@/hooks/use-confirm-delete';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { canPayDue } from '@/lib/contact-actions';
import { type BreadcrumbItem } from '@/types';
import { type Account, type ContactListItem, type ContactType, type CustomerGroup, type Paginated } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { BookOpen, Pencil, Power, PowerOff, Receipt, ShoppingBag, Trash2, UsersRound, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useContactColumns } from './table/columns';

interface ContactFilterState extends TableFilterBase {
    search: string | null;
    type: ContactType | null;
    customer_group_id: number | null;
    per_page: number | 'all';
}

interface ContactsIndexProps {
    contacts: Paginated<ContactListItem>;
    stats: ContactStats;
    customerGroups: CustomerGroup[];
    accounts: Account[];
    filters: ContactFilterState;
}

export default function ContactsIndex({ contacts, stats, customerGroups, accounts, filters }: ContactsIndexProps) {
    const { t } = useTranslation();

    const pageTitle =
        filters.type === 'customer'
            ? t('contactsPage', 'title_customers')
            : filters.type === 'supplier'
              ? t('contactsPage', 'title_suppliers')
              : t('contactsPage', 'title');
    const breadcrumbs: BreadcrumbItem[] = [{ title: pageTitle, href: '/contacts' }];

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editing, setEditing] = useState<ContactListItem | null>(null);
    const [paying, setPaying] = useState<ContactListItem | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [sendNotificationOpen, setSendNotificationOpen] = useState(false);

    const list = useListPage({
        routeName: 'contacts.index',
        filters,
        emptyFilters: { type: null, customer_group_id: null },
        rows: contacts.data,
        getId: (contact) => contact.id,
        export: { routeName: 'contacts.export', filterKeys: ['type', 'customer_group_id'], columnMap: CONTACT_EXPORT_COLUMN_MAP },
    });
    const { selection } = list;

    const deletion = useConfirmDelete<ContactListItem>({
        routeName: 'contacts.destroy',
        errorKey: 'contact',
        fallbackError: 'Could not delete this contact.',
        successMessage: () => 'Contact deleted.',
    });

    const selectedContacts = useMemo(
        () => contacts.data.filter((contact) => selection.selectedIds.includes(contact.id)),
        [contacts.data, selection.selectedIds],
    );

    const openForm = useCallback((contact: ContactListItem | null) => {
        setEditing(contact);
        setFormModalOpen(true);
    }, []);

    // The header's global "Quick Create" menu links here with `?quick_create=1` — open the Add Contact modal on arrival.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('quick_create') !== '1') return;

        openForm(null);
        params.delete('quick_create');
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleActive = (contact: ContactListItem) => {
        router.post(
            route('contacts.toggle-active', contact.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success(contact.is_active ? 'Contact deactivated.' : 'Contact activated.'),
                onError: () => toast.error('Could not update this contact.'),
            },
        );
    };

    const confirmBulkDelete = () => {
        router.post(
            route('contacts.bulk-delete'),
            { ids: selection.selectedIds },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Selected contacts deleted.'),
                onError: (errors) => toast.error(errors.contacts ?? 'Some contacts could not be deleted.'),
                onFinish: () => {
                    setBulkDeleteOpen(false);
                    selection.clear();
                },
            },
        );
    };

    const contactActions = useCallback(
        (contact: ContactListItem): RowAction[] => [
            { label: t('contactShow', 'ledger'), icon: BookOpen, href: route('contacts.show', contact.id) },
            {
                label: t('contactShow', 'purchases'),
                icon: ShoppingBag,
                href: route('purchases.index', { supplier_id: contact.id }),
                hidden: contact.type === 'customer',
            },
            {
                label: t('contactShow', 'sales'),
                icon: Receipt,
                href: route('sales.index', { customer_id: contact.id }),
                hidden: contact.type === 'supplier',
            },
            { label: t('contactShow', 'pay_due'), icon: Wallet, onClick: () => setPaying(contact), hidden: !canPayDue(contact) },
            { label: t('common', 'edit'), icon: Pencil, onClick: () => openForm(contact) },
            {
                label: contact.is_active ? t('common', 'deactivate') : t('common', 'activate'),
                icon: contact.is_active ? PowerOff : Power,
                onClick: () => toggleActive(contact),
            },
            {
                label: t('common', 'delete'),
                icon: Trash2,
                variant: 'destructive',
                separatorBefore: true,
                onClick: () => deletion.setTarget(contact),
                hidden: !contact.can_delete,
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [openForm, t],
    );

    const columns = useContactColumns({ sort: filters.sort, direction: filters.direction, onSort: list.handleSort, selection, contactActions });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    icon={UsersRound}
                    iconClassName="bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400"
                    title={pageTitle}
                    description={t('contactsPage', 'description')}
                    actions={<AddButton onClick={() => openForm(null)} title={t('contactsPage', 'add_contact')} />}
                />

                <ContactStatCards
                    stats={stats}
                    totalLabel={t('contactsPage', 'stats_total')}
                    activeLabel={t('contactsPage', 'stats_active')}
                    receivableLabel={t('contactsPage', 'stats_receivable')}
                    payableLabel={t('contactsPage', 'stats_payable')}
                />

                <ListTable
                    selectionSlot={
                        <ContactBulkBar
                            count={selection.selectedIds.length}
                            onClear={selection.clear}
                            onNotify={() => setSendNotificationOpen(true)}
                            onDelete={() => setBulkDeleteOpen(true)}
                        />
                    }
                    list={list}
                    data={contacts}
                    filters={filters}
                    columns={columns}
                    getRowKey={(contact) => contact.id}
                    renderGridCard={(contact) => (
                        <ContactGridCard
                            contact={contact}
                            selected={selection.isSelected(contact.id)}
                            onToggleSelected={(checked) => selection.toggle(contact.id, checked)}
                            actions={contactActions(contact)}
                        />
                    )}
                    itemLabel={t('contactsPage', 'item_label')}
                    searchPlaceholder={t('contactsPage', 'search_placeholder')}
                    visibilityColumns={CONTACT_VISIBILITY_COLUMNS}
                    exportColumns={CONTACT_EXPORT_COLUMNS}
                    filterSlot={<ContactFilters filters={filters} customerGroups={customerGroups} onChange={list.applyFilters} />}
                    emptyState={
                        <EmptyState title={t('contactsPage', 'empty_title')} description={t('contactsPage', 'empty_description')}>
                            <AddButton onClick={() => openForm(null)} title={t('contactsPage', 'add_contact')} className="mt-2" />
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title={t('common', 'no_results_title')} description={t('common', 'no_results_description')}>
                            <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                {t('common', 'clear_filters')}
                            </Button>
                        </EmptyState>
                    }
                />
            </div>

            <ContactFormModal
                open={formModalOpen}
                onOpenChange={setFormModalOpen}
                editing={editing}
                customerGroups={customerGroups}
                defaultType={filters.type}
            />

            {paying && <PayDueModal open={paying !== null} onOpenChange={(open) => !open && setPaying(null)} contact={paying} accounts={accounts} />}

            <ConfirmDialog
                open={deletion.target !== null}
                onOpenChange={(open) => !open && deletion.setTarget(null)}
                title={t('contactsPage', 'delete_title')}
                description={`"${deletion.target?.name}" ${t('contactsPage', 'delete_description')}`}
                confirmLabel={t('common', 'delete')}
                onConfirm={deletion.confirm}
            />

            <ConfirmDialog
                open={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                title={`${t('contactsPage', 'bulk_delete_title_prefix')} ${selection.selectedIds.length} ${t('contactsPage', 'bulk_delete_title_suffix')}`}
                description={t('contactsPage', 'bulk_delete_description')}
                confirmLabel={t('common', 'delete')}
                onConfirm={confirmBulkDelete}
            />

            <SendNotificationModal
                open={sendNotificationOpen}
                onOpenChange={setSendNotificationOpen}
                recipients={selectedContacts}
                onSuccess={() => selection.clear()}
            />
        </AppLayout>
    );
}
