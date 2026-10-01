import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase, useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime, today } from '@/lib/format-date';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type CashBookEntry, type CashBookEntryType, type MiscTransactionCategory, type Paginated } from '@/types/models';
import { Head, useForm, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { FormEventHandler, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Petty Cash',
        href: '/cash-book',
    },
];

interface CashBookFilters extends TableFilterBase {
    category_id: number | null;
    per_page: number | 'all';
}

interface CashBookIndexProps {
    cashBook: { id: number; current_balance: number };
    entries: Paginated<CashBookEntry>;
    categories: MiscTransactionCategory[];
    filters: CashBookFilters;
    openingBalanceSet: boolean;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'note', label: 'Note' },
    { id: 'in', label: 'In' },
    { id: 'out', label: 'Out' },
];

/** Matches `CashBookExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'entry_date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'note', label: 'Note' },
    { id: 'type', label: 'Type' },
    { id: 'in_amount', label: 'In' },
    { id: 'out_amount', label: 'Out' },
];

export default function CashBookIndex({ cashBook, entries, categories, filters, openingBalanceSet }: CashBookIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [entryModalOpen, setEntryModalOpen] = useState(false);

    const entryForm = useForm({
        type: 'expense' as CashBookEntryType,
        category_id: null as number | null,
        amount: 0,
        entry_date: today(),
        note: '',
    });

    const categoryOptions = categories.filter((category) => category.type === entryForm.data.type);

    const { isLoading, applyFilters, handleSort, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'cash-book.index',
        filters,
        emptyFilters: { category_id: null },
    });

    const selection = useTableSelection({
        rows: entries.data,
        getId: (entry) => entry.id,
    });

    const handleExport = useTableExport({
        routeName: 'cash-book.export',
        filters,
        filterKeys: ['category_id'],
        selectedIds: selection.selectedIds,
    });

    const openEntryModal = () => {
        entryForm.clearErrors();
        entryForm.setData({ type: 'expense', category_id: null, amount: 0, entry_date: today(), note: '' });
        setEntryModalOpen(true);
    };

    const submitEntry: FormEventHandler = (e) => {
        e.preventDefault();

        entryForm.post(route('cash-book.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Entry added.');
                setEntryModalOpen(false);
            },
        });
    };

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('date')) ids.push('entry_date');
        if (isVisible('category')) ids.push('category');
        if (isVisible('note')) ids.push('note');
        if (isVisible('in')) ids.push('in_amount');
        if (isVisible('out')) ids.push('out_amount');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<CashBookEntry>[]>(
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
                id: 'date',
                header: () => (
                    <DataTableColumnHeader
                        title="Date"
                        sortKey="entry_date"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                    />
                ),
                meta: { cellClassName: 'whitespace-nowrap', label: 'Date & Time' },
                cell: ({ row }) => formatDateTime(row.original.entry_date),
            },
            { id: 'category', header: 'Category', cell: ({ row }) => row.original.category?.name ?? 'Opening Balance' },
            { id: 'note', header: 'Note', cell: ({ row }) => <span className="text-muted-foreground">{row.original.note}</span> },
            {
                id: 'in',
                header: () => (
                    <DataTableColumnHeader
                        title="In"
                        sortKey="amount"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => (row.original.type === 'expense' ? '' : money(row.original.amount)),
            },
            {
                id: 'out',
                header: () => (
                    <DataTableColumnHeader
                        title="Out"
                        sortKey="amount"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => (row.original.type === 'expense' ? money(row.original.amount) : ''),
            },
        ],
        [money, selection, filters.sort, filters.direction, handleSort],
    );

    const renderGridCard = (entry: CashBookEntry) => (
        <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selection.isSelected(entry.id)} onCheckedChange={(checked) => selection.toggle(entry.id, checked)} />
                    <div className="min-w-0">
                        <div className="truncate font-medium">{entry.category?.name ?? 'Opening Balance'}</div>
                        {entry.note && <div className="text-muted-foreground truncate text-xs">{entry.note}</div>}
                    </div>
                </div>
                <span className="shrink-0 font-medium tabular-nums">
                    {entry.type === 'expense' ? `- ${money(entry.amount)}` : `+ ${money(entry.amount)}`}
                </span>
            </div>
            <div className="text-muted-foreground mt-2 text-xs whitespace-nowrap">{formatDateTime(entry.entry_date)}</div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Petty Cash" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Petty Cash" description="ছোট দৈনন্দিন খরচের আলাদা খাতা — Accounts বা Financial Position-এ ধরা হয় না" />
                    <Button onClick={openEntryModal}>Add Entry</Button>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Cash book balance</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(cashBook.current_balance)}</p>
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
                    totalCount={entries.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                    filterSlot={
                        <div className="grid min-w-0 content-start gap-2">
                            <Label htmlFor="category_filter">Category</Label>
                            <Select
                                value={filters.category_id ? String(filters.category_id) : 'all'}
                                onValueChange={(value) => applyFilters({ category_id: value === 'all' ? null : Number(value) })}
                            >
                                <SelectTrigger id="category_filter" className="w-56">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All categories</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={String(category.id)}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                <DataTable
                    columns={columns}
                    data={entries.data}
                    getRowKey={(entry) => entry.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title="No entries yet" description="চা, রিকশা ভাড়ার মতো ছোট খরচ এখানে দ্রুত লিখে রাখুন">
                            <Button className="mt-2" onClick={openEntryModal}>
                                Add Entry
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No entries match your filters" description="অন্য category দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={entries}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="entries"
                        />
                    }
                />
            </div>

            <FormModal
                open={entryModalOpen}
                onOpenChange={setEntryModalOpen}
                title="Add Petty Cash Entry"
                processing={entryForm.processing}
                onSubmit={submitEntry}
            >
                <FormSelect
                    id="type"
                    label="Type"
                    value={entryForm.data.type}
                    onChange={(val) => val && entryForm.setData({ ...entryForm.data, type: val as CashBookEntryType, category_id: null })}
                    options={[
                        { value: 'expense', label: 'Expense' },
                        { value: 'income', label: 'Income' },
                        ...(!openingBalanceSet ? [{ value: 'opening_balance', label: 'Opening Balance' }] : []),
                    ]}
                    error={entryForm.errors.type}
                />

                {entryForm.data.type !== 'opening_balance' && (
                    <FormSelect
                        id="category_id"
                        label="Category"
                        value={entryForm.data.category_id}
                        onChange={(val) => entryForm.setData('category_id', val ? Number(val) : null)}
                        options={categoryOptions.map((category) => ({ value: String(category.id), label: category.name }))}
                        placeholder="Select a category"
                        error={entryForm.errors.category_id}
                    />
                )}

                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <MoneyInput
                        id="amount"
                        value={entryForm.data.amount}
                        onChange={(e) => entryForm.setData('amount', Number(e.target.value))}
                        required
                    />
                    <InputError message={entryForm.errors.amount} />
                </div>

                <FormInput
                    id="entry_date"
                    label="Date"
                    type="date"
                    value={entryForm.data.entry_date}
                    onChange={(e) => entryForm.setData('entry_date', e.target.value)}
                    error={entryForm.errors.entry_date}
                    required
                />

                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="entry_note">Note</Label>
                    <Textarea id="entry_note" value={entryForm.data.note} onChange={(e) => entryForm.setData('note', e.target.value)} />
                    <InputError message={entryForm.errors.note} />
                </div>
            </FormModal>
        </AppLayout>
    );
}
