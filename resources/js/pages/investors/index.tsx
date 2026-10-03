import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import { getInvestorActions } from '@/components/investors/investor-actions';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type InvestorListItem, type Paginated } from '@/types/models';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { FormEventHandler, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Investors', href: '/investors' }, { title: 'Investors', href: '/investors' }];

interface InvestorFilters extends TableFilterBase {
    per_page: number | 'all';
}

interface InvestorsIndexProps {
    investors: Paginated<InvestorListItem>;
    totalInvested: number;
    filters: InvestorFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'name', label: 'Name' },
    { id: 'total', label: 'Total Invested' },
];

/** Matches `InvestorExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'name', label: 'Name' },
    { id: 'total_invested', label: 'Total Invested' },
];

export default function InvestorsIndex({ investors, totalInvested, filters }: InvestorsIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<InvestorListItem | null>(null);
    const [deleting, setDeleting] = useState<InvestorListItem | null>(null);

    const form = useForm({
        name: '',
        phone: '',
        note: '',
        opening_amount: 0,
    });

    const { isLoading, applyFilters, handleSort, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'investors.index',
        filters,
        emptyFilters: {},
    });

    const selection = useTableSelection({
        rows: investors.data,
        getId: (investor) => investor.id,
    });

    const handleExport = useTableExport({
        routeName: 'investors.export',
        filters,
        filterKeys: [],
        selectedIds: selection.selectedIds,
    });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '', phone: '', note: '', opening_amount: 0 });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = useCallback(
        (investor: InvestorListItem) => {
            form.clearErrors();
            form.setData({
                name: investor.name,
                phone: investor.phone || '',
                note: investor.note || '',
                opening_amount: investor.opening_amount,
            });
            setEditing(investor);
            setModalOpen(true);
        },
        [form],
    );

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const isEditing = editing !== null;
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEditing ? 'Investor updated.' : 'Investor added.');
                setModalOpen(false);
            },
        };

        if (editing) {
            form.patch(route('investors.update', editing.id), options);
        } else {
            form.post(route('investors.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        const name = deleting.name;

        router.delete(route('investors.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${name}" deleted.`),
            onError: (errors) => toast.error(errors.investor ?? 'Could not delete investor.'),
            onFinish: () => setDeleting(null),
        });
    };

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('name')) ids.push('name');
        if (isVisible('total')) ids.push('total_invested');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<InvestorListItem>[]>(
        () => [
            {
                id: 'select',
                header: () => (
                    <DataTableCheckbox
                        checked={selection.isAllSelected ? true : selection.isSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={selection.toggleAll}
                    />
                ),
                meta: { headerClassName: 'w-10', cellClassName: 'w-10', printHidden: true },
                cell: ({ row }) => (
                    <DataTableCheckbox
                        checked={selection.isSelected(row.original.id)}
                        onCheckedChange={(checked) => selection.toggle(row.original.id, checked)}
                    />
                ),
            },
            {
                id: 'actions',
                header: '',
                meta: { headerClassName: 'w-10', cellClassName: 'w-10', printHidden: true },
                cell: ({ row }) => <DataTableRowActions actions={getInvestorActions(row.original, { onEdit: openEdit, onDelete: setDeleting })} />,
            },
            {
                id: 'name',
                header: () => (
                    <DataTableColumnHeader
                        title="Name"
                        sortKey="name"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'asc'}
                        onSort={handleSort}
                    />
                ),
                cell: ({ row }) => (
                    <Link href={route('investors.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.name}
                    </Link>
                ),
            },
            {
                id: 'total',
                header: () => (
                    <DataTableColumnHeader
                        title="Total Invested"
                        sortKey="current_balance"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'asc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_invested),
            },
        ],
        [money, selection, openEdit, filters.sort, filters.direction, handleSort],
    );

    const renderGridCard = useCallback(
        (investor: InvestorListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox
                            checked={selection.isSelected(investor.id)}
                            onCheckedChange={(checked) => selection.toggle(investor.id, checked)}
                        />
                        <Link href={route('investors.show', investor.id)} className="truncate font-medium underline-offset-2 hover:underline">
                            {investor.name}
                        </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(investor.total_invested)}</span>
                        <DataTableRowActions actions={getInvestorActions(investor, { onEdit: openEdit, onDelete: setDeleting })} />
                    </div>
                </div>
            </div>
        ),
        [money, selection, openEdit],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Investors" />

            <div className="space-y-6 px-4 py-6">
                <Tabs value="/investors" onValueChange={(url) => router.visit(url)}>
                    <TabsList>
                        <TabsTrigger value="/investors">Investors</TabsTrigger>
                        <TabsTrigger value="/company-loans">Company Loans</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Investors" description="দোকানে যারা মূলধন বিনিয়োগ করেছেন" />
                    <Button onClick={openCreate}>Add Investor</Button>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Total invested</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(totalInvested)}</p>
                </div>

                <DataTableToolbar
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
                    totalCount={investors.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                />

                <DataTable
                    columns={columns}
                    data={investors.data}
                    getRowKey={(investor) => investor.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title="No investors yet" description="প্রথম investor যোগ করুন">
                            <Button className="mt-2" onClick={openCreate}>
                                Add Investor
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No investors match your filters" description="অন্য filter দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={investors}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="investors"
                        />
                    }
                />
            </div>

            <FormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Edit Investor' : 'Add Investor'}
                processing={form.processing}
                onSubmit={submit}
            >
                <FormInput
                    id="name"
                    label="Name"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder="e.g. Rafiqul Islam"
                    error={form.errors.name}
                    required
                />

                <FormInput
                    id="phone"
                    label="Phone Number"
                    value={form.data.phone}
                    onChange={(e) => form.setData('phone', e.target.value)}
                    placeholder="e.g. 01712345678"
                    error={form.errors.phone}
                />

                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="opening_amount" required={editing !== null}>
                        Opening Balance
                    </Label>
                    <MoneyInput
                        id="opening_amount"
                        value={form.data.opening_amount}
                        disabled={editing !== null && !editing.can_edit_opening_amount}
                        onChange={(e) => form.setData('opening_amount', Number(e.target.value))}
                        required={editing !== null}
                    />
                    <p className="text-muted-foreground text-xs">সিস্টেমে আসার আগে এই investor যে মূলধন আগেই দিয়েছেন (কোনো account-এর টাকা বাড়বে না)।</p>
                    {editing !== null && !editing.can_edit_opening_amount && (
                        <p className="text-muted-foreground text-xs">এই investor-এর লেনদেন হয়ে গেছে — opening balance আর বদলানো যাবে না।</p>
                    )}
                    <InputError message={form.errors.opening_amount} />
                </div>

                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="note">Note</Label>
                    <textarea
                        id="note"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={form.data.note}
                        onChange={(e) => form.setData('note', e.target.value)}
                        placeholder="e.g. Initial investor agreement details"
                    />
                    <InputError message={form.errors.note} />
                </div>
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete investor?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
