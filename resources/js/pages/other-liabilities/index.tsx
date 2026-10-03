import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { getOtherLiabilityActions } from '@/components/other-liabilities/other-liability-actions';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Label } from '@/components/ui/label';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type OtherLiabilityListItem, type Paginated } from '@/types/models';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { FormEventHandler, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Assets & Liabilities', href: '/assets' }, { title: 'Other Liabilities', href: '/other-liabilities' }];

interface OtherLiabilityFilters extends TableFilterBase {
    per_page: number | 'all';
}

interface OtherLiabilitiesIndexProps {
    liabilities: Paginated<OtherLiabilityListItem>;
    totalBalance: number;
    filters: OtherLiabilityFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'name', label: 'Name' },
    { id: 'current_balance', label: 'Current Balance' },
];

/** Matches `OtherLiabilityExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'name', label: 'Name' },
    { id: 'opening_amount', label: 'Opening Amount' },
    { id: 'current_balance', label: 'Current Balance' },
];

export default function OtherLiabilitiesIndex({ liabilities, totalBalance, filters }: OtherLiabilitiesIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<OtherLiabilityListItem | null>(null);
    const [deleting, setDeleting] = useState<OtherLiabilityListItem | null>(null);

    const form = useForm({ name: '', opening_amount: 0 });

    const { isLoading, applyFilters, handleSort, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'other-liabilities.index',
        filters,
        emptyFilters: {},
    });

    const selection = useTableSelection({
        rows: liabilities.data,
        getId: (liability) => liability.id,
    });

    const handleExport = useTableExport({
        routeName: 'other-liabilities.export',
        filters,
        filterKeys: [],
        selectedIds: selection.selectedIds,
    });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '', opening_amount: 0 });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = useCallback(
        (liability: OtherLiabilityListItem) => {
            form.clearErrors();
            form.setData({ name: liability.name, opening_amount: liability.opening_amount });
            setEditing(liability);
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
                toast.success(isEditing ? 'Liability updated.' : 'Liability added.');
                setModalOpen(false);
            },
        };

        if (editing) {
            form.patch(route('other-liabilities.update', editing.id), options);
        } else {
            form.post(route('other-liabilities.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        const name = deleting.name;

        router.delete(route('other-liabilities.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${name}" deleted.`),
            onError: (errors) => toast.error(errors.liability ?? 'Could not delete liability.'),
            onFinish: () => setDeleting(null),
        });
    };

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('name')) ids.push('name');
        if (isVisible('current_balance')) ids.push('current_balance');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<OtherLiabilityListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getOtherLiabilityActions(row.original, { onEdit: openEdit, onDelete: setDeleting })} />,
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
                    <Link href={route('other-liabilities.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.name}
                    </Link>
                ),
            },
            {
                id: 'current_balance',
                header: () => (
                    <DataTableColumnHeader
                        title="Current Balance"
                        sortKey="current_balance"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'asc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.current_balance),
            },
        ],
        [money, selection, openEdit, filters.sort, filters.direction, handleSort],
    );

    const renderGridCard = useCallback(
        (liability: OtherLiabilityListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox
                            checked={selection.isSelected(liability.id)}
                            onCheckedChange={(checked) => selection.toggle(liability.id, checked)}
                        />
                        <Link
                            href={route('other-liabilities.show', liability.id)}
                            className="truncate font-medium underline-offset-2 hover:underline"
                        >
                            {liability.name}
                        </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(liability.current_balance)}</span>
                        <DataTableRowActions actions={getOtherLiabilityActions(liability, { onEdit: openEdit, onDelete: setDeleting })} />
                    </div>
                </div>
            </div>
        ),
        [money, selection, openEdit],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Other Liabilities" />

            <div className="space-y-6 px-4 py-6">
                <Tabs value="/other-liabilities" onValueChange={(url) => router.visit(url)}>
                    <TabsList>
                        <TabsTrigger value="/assets">Assets</TabsTrigger>
                        <TabsTrigger value="/other-liabilities">Other Liabilities</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Other Liabilities" description="Loan/Supplier/Expense-এর বাইরের অন্য দেনা" />
                    <Button onClick={openCreate}>Add Liability</Button>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Total balance</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(totalBalance)}</p>
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
                    totalCount={liabilities.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                />

                <DataTable
                    columns={columns}
                    data={liabilities.data}
                    getRowKey={(liability) => liability.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title="No liabilities yet" description="প্রথম liability যোগ করুন">
                            <Button className="mt-2" onClick={openCreate}>
                                Add Liability
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No liabilities match your filters" description="অন্য filter দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={liabilities}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="liabilities"
                        />
                    }
                />
            </div>

            <FormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Edit Liability' : 'Add Liability'}
                processing={form.processing}
                onSubmit={submit}
            >
                <FormInput
                    id="name"
                    label="Name"
                    placeholder="Unpaid Tax 2024, Personal loan from brother..."
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    error={form.errors.name}
                    required
                />

                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="opening_amount" required={editing !== null}>
                        Opening Amount
                    </Label>
                    <MoneyInput
                        id="opening_amount"
                        value={form.data.opening_amount}
                        disabled={editing !== null && !editing.can_edit_opening_amount}
                        onChange={(e) => form.setData('opening_amount', Number(e.target.value))}
                        required={editing !== null}
                    />
                    {editing !== null && !editing.can_edit_opening_amount && (
                        <p className="text-muted-foreground text-xs">এই liability-তে লেনদেন হয়ে গেছে — opening amount আর বদলানো যাবে না।</p>
                    )}
                    <InputError message={form.errors.opening_amount} />
                </div>
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete liability?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
