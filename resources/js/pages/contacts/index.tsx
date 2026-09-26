import ContactFormModal from '@/components/contacts/contact-form-modal';
import PayDueModal from '@/components/contacts/pay-due-modal';
import ContactStatCards, { type ContactStats } from '@/components/contacts/contact-stat-cards';
import SendNotificationModal from '@/components/contacts/send-notification-modal';
import DataTable from '@/components/data-table/data-table';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions, { type RowAction } from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTableExport } from '@/hooks/table/use-table-export';
import { useTableFilters, type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Account, type ContactListItem, type ContactType, type CustomerGroup, type Paginated } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type VisibilityState } from '@tanstack/react-table';
import { BookOpen, Bell, Download, Pencil, Plus, Power, PowerOff, Receipt, ShoppingBag, Trash2, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { activeColor, typeColor, useContactColumns, useContactTypeLabel } from './table/columns';

interface ContactFilters extends TableFilterBase {
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
    filters: ContactFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'contact_id', label: 'Contact ID' },
    { id: 'name', label: 'Name' },
    { id: 'contact', label: 'Contact' },
    { id: 'address', label: 'Address' },
    { id: 'type', label: 'Type' },
    { id: 'balance', label: 'Balance' },
    { id: 'status', label: 'Status' },
];

/** Matches `ContactController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'name', label: 'Name' },
    { id: 'contact_code', label: 'Contact ID' },
    { id: 'phone', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'type', label: 'Type' },
    { id: 'business_name', label: 'Business Name' },
    { id: 'address', label: 'Address' },
    { id: 'customer_group', label: 'Customer Group' },
    { id: 'balance', label: 'Balance' },
    { id: 'is_active', label: 'Status' },
];

export default function ContactsIndex({ contacts, stats, customerGroups, accounts, filters }: ContactsIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const isMobile = useIsMobile();
    const { t } = useTranslation();
    const typeLabel = useContactTypeLabel();
    const money = useMoneyFormat();

    // The page is shared by customers and suppliers (`?type=` filters the same list) — the
    // heading should say which one you're actually looking at instead of a generic "Contacts".
    const pageTitle =
        filters.type === 'customer'
            ? t('contactsPage', 'title_customers')
            : filters.type === 'supplier'
              ? t('contactsPage', 'title_suppliers')
              : t('contactsPage', 'title');

    const breadcrumbs: BreadcrumbItem[] = [{ title: pageTitle, href: '/contacts' }];
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editing, setEditing] = useState<ContactListItem | null>(null);
    const [deleting, setDeleting] = useState<ContactListItem | null>(null);
    const [paying, setPaying] = useState<ContactListItem | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [sendNotificationOpen, setSendNotificationOpen] = useState(false);
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const { search, setSearch, isLoading, isSearching, applyFilters, submitSearchNow, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'contacts.index',
        filters,
        emptyFilters: { type: null, customer_group_id: null },
    });

    const selection = useTableSelection({
        rows: contacts.data,
        getId: (contact) => contact.id,
    });

    const handleExport = useTableExport({
        routeName: 'contacts.export',
        filters,
        filterKeys: ['type', 'customer_group_id'],
        selectedIds: selection.selectedIds,
    });

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('contact_id')) ids.push('contact_code');
        if (isVisible('name')) ids.push('name', 'business_name');
        if (isVisible('contact')) ids.push('phone', 'email');
        if (isVisible('address')) ids.push('address');
        if (isVisible('type')) ids.push('type', 'customer_group');
        if (isVisible('balance')) ids.push('balance');
        if (isVisible('status')) ids.push('is_active');

        return ids;
    }, [columnVisibility]);

    const selectedContacts = useMemo(
        () => contacts.data.filter((contact) => selection.selectedIds.includes(contact.id)),
        [contacts.data, selection.selectedIds],
    );

    const openCreate = useCallback(() => {
        setEditing(null);
        setFormModalOpen(true);
    }, []);

    // The header's global "Quick Create" menu can't reach into this page's local modal
    // state, so it links here with `?quick_create=1` (plus `?type=` to preselect
    // Customer/Supplier) and this opens the same Add Contact modal on arrival.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('quick_create') !== '1') return;

        openCreate();
        params.delete('quick_create');
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openEdit = useCallback((contact: ContactListItem) => {
        setEditing(contact);
        setFormModalOpen(true);
    }, []);

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('contacts.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success('Contact deleted.'),
            onError: (errors) => toast.error(errors.contact ?? 'Could not delete this contact.'),
            onFinish: () => setDeleting(null),
        });
    };

    const exportSelected = () => {
        handleExport({ format: 'csv', scope: 'selected', columns: defaultExportColumns });
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
            { label: t('contactShow', 'pay_due'), icon: Wallet, onClick: () => setPaying(contact) },
            { label: t('common', 'edit'), icon: Pencil, onClick: () => openEdit(contact) },
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
                onClick: () => setDeleting(contact),
                hidden: !contact.can_delete,
            },
        ],
        [openEdit, t],
    );

    const columns = useContactColumns({ selection, contactActions });

    const renderGridCard = useCallback(
        (contact: ContactListItem) => {
            const initials =
                contact.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join('') || '—';

            const accentBorder: Record<ContactType, string> = {
                customer: 'border-l-sky-400',
                supplier: 'border-l-purple-400',
                both: 'border-l-teal-400',
            };

            const avatarTone: Record<ContactType, string> = {
                customer: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
                supplier: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
                both: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
            };

            return (
                <div className={cn('rounded-xl border border-l-4 bg-card p-4 transition-shadow hover:shadow-md', accentBorder[contact.type])}>
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-3">
                            <Checkbox
                                className="mt-1"
                                checked={selection.isSelected(contact.id)}
                                onCheckedChange={(checked) => selection.toggle(contact.id, checked === true)}
                            />
                            <div
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                                    avatarTone[contact.type],
                                )}
                            >
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <Link href={route('contacts.show', contact.id)} className="truncate font-medium underline-offset-2 hover:underline">
                                    {contact.name}
                                </Link>
                                {contact.business_name && <div className="text-muted-foreground truncate text-xs">{contact.business_name}</div>}
                                <div className="text-muted-foreground truncate text-xs">{contact.phone}</div>
                            </div>
                        </div>
                        <DataTableRowActions actions={contactActions(contact)} />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                        <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline" className={typeColor[contact.type]}>
                                {typeLabel[contact.type]}
                            </Badge>
                            <Badge variant="outline" className={activeColor(contact.is_active)}>
                                {contact.is_active ? t('common', 'active') : t('common', 'inactive')}
                            </Badge>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{money(contact.balance)}</span>
                    </div>
                </div>
            );
        },
        [selection, contactActions, t, typeLabel, money],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title={pageTitle} description={t('contactsPage', 'description')} />
                    <Button onClick={openCreate}>
                        <Plus /> {t('contactsPage', 'add_contact')}
                    </Button>
                </div>

                <ContactStatCards
                    stats={stats}
                    totalLabel={t('contactsPage', 'stats_total')}
                    activeLabel={t('contactsPage', 'stats_active')}
                    receivableLabel={t('contactsPage', 'stats_receivable')}
                    payableLabel={t('contactsPage', 'stats_payable')}
                />

                <DataTableToolbar
                    search={search}
                    onSearchChange={setSearch}
                    onSearchSubmit={submitSearchNow}
                    isSearching={isSearching}
                    searchPlaceholder={t('contactsPage', 'search_placeholder')}
                    activeFilterCount={activeFilterCount}
                    canReset={canReset}
                    onReset={resetFilters}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    visibilityColumns={getVisibilityColumns()}
                    columnVisibility={columnVisibility}
                    onVisibilityChange={(id, visible) => setColumnVisibility((current) => ({ ...current, [id]: visible }))}
                    exportColumns={getExportColumns()}
                    defaultExportColumns={defaultExportColumns}
                    totalCount={contacts.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <Select
                                value={filters.type ?? 'all'}
                                onValueChange={(value) => applyFilters({ type: value === 'all' ? null : (value as ContactType) })}
                            >
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder={t('contactsPage', 'type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('contactsPage', 'all_types')}</SelectItem>
                                    <SelectItem value="customer">{t('nav', 'customer')}</SelectItem>
                                    <SelectItem value="supplier">{t('nav', 'supplier')}</SelectItem>
                                    <SelectItem value="both">{t('common', 'both')}</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.customer_group_id ? String(filters.customer_group_id) : 'all'}
                                onValueChange={(value) => applyFilters({ customer_group_id: value === 'all' ? null : Number(value) })}
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder={t('nav', 'customer_group')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('contactsPage', 'all_groups')}</SelectItem>
                                    {customerGroups.map((group) => (
                                        <SelectItem key={group.id} value={String(group.id)}>
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                {selection.selectedIds.length > 0 && !isMobile && (
                    <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
                        <p className="text-sm">
                            {selection.selectedIds.length} {t('contactsPage', 'selected')}
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSendNotificationOpen(true)}>
                                <Bell /> {t('contactsPage', 'send_notification')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportSelected}>
                                <Download /> {t('common', 'export')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                                {t('common', 'delete')}
                            </Button>
                        </div>
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={contacts.data}
                    getRowKey={(contact) => contact.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title={t('contactsPage', 'empty_title')} description={t('contactsPage', 'empty_description')}>
                            <Button className="mt-2" onClick={openCreate}>
                                {t('contactsPage', 'add_contact')}
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title={t('common', 'no_results_title')} description={t('common', 'no_results_description')}>
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                {t('common', 'clear_filters')}
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={contacts}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel={t('contactsPage', 'item_label')}
                        />
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

            {paying && (
                <PayDueModal open={paying !== null} onOpenChange={(open) => !open && setPaying(null)} contact={paying} accounts={accounts} />
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={t('contactsPage', 'delete_title')}
                description={`"${deleting?.name}" ${t('contactsPage', 'delete_description')}`}
                confirmLabel={t('common', 'delete')}
                onConfirm={confirmDelete}
            />

            <ConfirmDialog
                open={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                title={`${t('contactsPage', 'bulk_delete_title_prefix')} ${selection.selectedIds.length} ${t('contactsPage', 'bulk_delete_title_suffix')}`}
                description={t('contactsPage', 'bulk_delete_description')}
                confirmLabel={t('common', 'delete')}
                onConfirm={confirmBulkDelete}
            />

            {/* Thumb-reachable on mobile — the same bulk bar sits inline above the table on desktop instead. */}
            {selection.selectedIds.length > 0 && isMobile && (
                <div className="bg-background fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t p-3 shadow-lg">
                    <p className="text-sm">
                        {selection.selectedIds.length} {t('contactsPage', 'selected')}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSendNotificationOpen(true)}>
                            <Bell /> {t('contactsPage', 'send')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportSelected}>
                            <Download /> {t('common', 'export')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                            {t('common', 'delete')}
                        </Button>
                    </div>
                </div>
            )}

            <SendNotificationModal
                open={sendNotificationOpen}
                onOpenChange={setSendNotificationOpen}
                recipients={selectedContacts}
                onSuccess={() => selection.clear()}
            />
        </AppLayout>
    );
}
