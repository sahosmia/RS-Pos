import OtherIncomeCategoryManager from '@/components/other-income/category-manager';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import { MetricCard } from '@/components/shared/metric-card';
import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase, useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { formatDate, today } from '@/lib/format-date';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Account, type OtherIncomeCategoryRow, type OtherIncomeListItem, type Paginated } from '@/types/models';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Other Income', href: '/other-income' }];

interface OtherIncomeFilters extends TableFilterBase {
    category_id: number | null;
    per_page: number | 'all';
}

interface OtherIncomeIndexProps {
    incomes: Paginated<OtherIncomeListItem>;
    totalIncome: number;
    categories: OtherIncomeCategoryRow[];
    accounts: Account[];
    filters: OtherIncomeFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'account', label: 'Account' },
    { id: 'note', label: 'Note' },
    { id: 'amount', label: 'Amount' },
    { id: 'added_by', label: 'Added by' },
];

/** Matches `OtherIncomeExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'income_date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'account', label: 'Account' },
    { id: 'note', label: 'Note' },
    { id: 'amount', label: 'Amount' },
];

export default function OtherIncomeIndex({ incomes, totalIncome, categories, accounts, filters }: OtherIncomeIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [tab, setTab] = useState<'income' | 'categories'>('income');
    const [modalOpen, setModalOpen] = useState(false);
    const [deleting, setDeleting] = useState<OtherIncomeListItem | null>(null);

    const form = useForm({
        other_income_category_id: null as number | null,
        account_id: null as number | null,
        amount: 0,
        income_date: today(),
        note: '',
    });

    const { isLoading, applyFilters, handleSort, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'other-income.index',
        filters,
        emptyFilters: { category_id: null },
    });

    const selection = useTableSelection({
        rows: incomes.data,
        getId: (income) => income.id,
    });

    const handleExport = useTableExport({
        routeName: 'other-income.export',
        filters,
        filterKeys: ['category_id'],
        selectedIds: selection.selectedIds,
    });

    const openCreate = () => {
        form.clearErrors();
        form.setData({
            other_income_category_id: null,
            account_id: accounts.find((account) => account.is_default)?.id ?? accounts[0]?.id ?? null,
            amount: 0,
            income_date: today(),
            note: '',
        });
        setModalOpen(true);
    };

    // Quick actions (Ctrl+Space) link here with `?quick_create=1` to open the Add Income modal on arrival.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('quick_create') !== '1') return;

        openCreate();
        params.delete('quick_create');
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('other-income.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Income added.');
                setModalOpen(false);
            },
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('other-income.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Income deleted — the account and journal were reversed.');
                setDeleting(null);
            },
            onError: (errors) => {
                toast.error(Object.values(errors)[0] ?? 'Could not delete this income.');
                setDeleting(null);
            },
        });
    };

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('date')) ids.push('income_date');
        if (isVisible('category')) ids.push('category');
        if (isVisible('account')) ids.push('account');
        if (isVisible('note')) ids.push('note');
        if (isVisible('amount')) ids.push('amount');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<OtherIncomeListItem>[]>(
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
                        sortKey="income_date"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                    />
                ),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.income_date),
            },
            { id: 'category', header: 'Category', cell: ({ row }) => row.original.category.name },
            { id: 'account', header: 'Account', cell: ({ row }) => row.original.account.name },
            { id: 'note', header: 'Note', cell: ({ row }) => <span className="text-muted-foreground">{row.original.note}</span> },
            {
                id: 'amount',
                header: () => (
                    <DataTableColumnHeader
                        title="Amount"
                        sortKey="amount"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.amount),
            },
            {
                id: 'actions',
                header: '',
                meta: { headerClassName: 'w-10', cellClassName: 'w-10', printHidden: true },
                cell: ({ row }) => (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-8"
                        onClick={() => setDeleting(row.original)}
                        aria-label="Delete income"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                ),
            },
            { id: 'added_by', header: 'Added by', cell: ({ row }) => <span className="text-muted-foreground">{row.original.added_by ?? '—'}</span> },
        ],
        [money, selection, filters.sort, filters.direction, handleSort],
    );

    const renderGridCard = (income: OtherIncomeListItem) => (
        <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selection.isSelected(income.id)} onCheckedChange={(checked) => selection.toggle(income.id, checked)} />
                    <div className="min-w-0">
                        <div className="truncate font-medium">{income.category.name}</div>
                        {income.note && <div className="text-muted-foreground truncate text-xs">{income.note}</div>}
                    </div>
                </div>
                <span className="shrink-0 font-medium tabular-nums">+ {money(income.amount)}</span>
            </div>
            <div className="text-muted-foreground mt-2 flex justify-between gap-2 text-xs">
                <span className="whitespace-nowrap">{formatDate(income.income_date)}</span>
                <span className="truncate">{income.account.name}</span>
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Other Income" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Other Income" description="বিক্রি ছাড়া ছোট আয় — যেমন কার্টন/স্ক্র্যাপ বিক্রি, সুদ, কমিশন" />
                    {tab === 'income' && <Button onClick={openCreate}>Add Income</Button>}
                </div>

                <Tabs value={tab} onValueChange={(value) => setTab(value === 'categories' ? 'categories' : 'income')}>
                    <TabsList>
                        <TabsTrigger value="income">Income</TabsTrigger>
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                    </TabsList>
                </Tabs>

                {tab === 'income' ? (
                    <>
                        <MetricCard label={activeFilterCount > 0 ? 'Total (filtered)' : 'Total other income'} value={money(totalIncome)} accent="success" className="sm:max-w-xs" />

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
                            totalCount={incomes.total}
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
                            data={incomes.data}
                            getRowKey={(income) => income.id}
                            renderGridCard={renderGridCard}
                            viewMode={viewMode}
                            columnVisibility={columnVisibility}
                            loading={isLoading}
                            canReset={canReset}
                            emptyState={
                                <EmptyState title="No income yet" description="কার্টন বা স্ক্র্যাপ বিক্রির মতো ছোট আয় এখানে লিখে রাখুন">
                                    <Button className="mt-2" onClick={openCreate}>
                                        Add Income
                                    </Button>
                                </EmptyState>
                            }
                            filteredEmptyState={
                                <EmptyState title="No income matches your filters" description="অন্য category দিয়ে আবার চেষ্টা করুন">
                                    <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                        Clear filters
                                    </Button>
                                </EmptyState>
                            }
                            footer={
                                <DataTablePagination
                                    pagination={incomes}
                                    perPage={filters.per_page}
                                    perPageOptions={shop.pagination_options}
                                    allowAll={shop.pagination_allow_all}
                                    onPerPageChange={(value) => applyFilters({ per_page: value })}
                                    onPageChange={(page) => applyFilters({ page })}
                                    itemLabel="entries"
                                />
                            }
                        />
                    </>
                ) : (
                    <OtherIncomeCategoryManager categories={categories} />
                )}
            </div>

            <FormModal open={modalOpen} onOpenChange={setModalOpen} title="Add Other Income" processing={form.processing} onSubmit={submit}>
                <FormSelect
                    id="other_income_category_id"
                    label="Category"
                    value={form.data.other_income_category_id}
                    onChange={(val) => form.setData('other_income_category_id', val ? Number(val) : null)}
                    options={categories.map((category) => ({ value: String(category.id), label: category.name }))}
                    placeholder="Select a category"
                    error={form.errors.other_income_category_id}
                    helperText={categories.length === 0 ? 'আগে Categories ট্যাব থেকে একটা category যোগ করুন।' : undefined}
                    required
                />

                <FormSelect
                    id="account_id"
                    label="Received Into Account"
                    value={form.data.account_id}
                    onChange={(val) => form.setData('account_id', val ? Number(val) : null)}
                    options={accounts.map((account) => ({ value: String(account.id), label: account.name }))}
                    placeholder="Select account"
                    error={form.errors.account_id}
                    helperText="টাকাটা এই account-এ জমা হবে।"
                    required
                />

                <MoneyInput
                    id="amount"
                    label="Amount"
                    value={form.data.amount}
                    onChange={(e) => form.setData('amount', Number(e.target.value))}
                    error={form.errors.amount}
                    required
                />

                <FormInput
                    id="income_date"
                    label="Date"
                    type="date"
                    value={form.data.income_date}
                    onChange={(e) => form.setData('income_date', e.target.value)}
                    error={form.errors.income_date}
                    required
                />

                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="income_note">Note</Label>
                    <Textarea
                        id="income_note"
                        placeholder="Add a note (optional)"
                        value={form.data.note}
                        onChange={(e) => form.setData('note', e.target.value)}
                    />
                    {form.errors.note && <p className="text-sm text-red-600">{form.errors.note}</p>}
                </div>
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete this income?"
                description={`${deleting ? money(deleting.amount) : ''} (${deleting?.category.name ?? ''}) মুছে ফেলা হবে — account থেকে টাকাটা কমবে আর journal reverse হবে।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
