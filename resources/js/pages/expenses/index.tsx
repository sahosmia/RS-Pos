import AddExpensePaymentModal from '@/components/expenses/add-expense-payment-modal';
import { getExpenseActions } from '@/components/expenses/expense-actions';
import ExpenseModal from '@/components/expenses/expense-modal';
import HeadingSmall from '@/components/heading-small';
import LookupManagerModal from '@/components/products/lookup-manager-modal';
import StatCards from '@/components/shared/stat-cards';
import ContactLink from '@/components/shared/contact-link';
import EmptyState from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { FormInput } from '@/components/form/form-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Account, type ExpenseCategoryOption, type ExpenseListItem, type Paginated, type PaymentStatusValue } from '@/types/models';
import { Head, usePage } from '@inertiajs/react';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Receipt } from 'lucide-react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Expenses', href: '/expenses' }];

interface ExpenseFilters extends TableFilterBase {
    from: string | null;
    to: string | null;
    expense_category_id: number | null;
    payment_status: PaymentStatusValue | null;
    per_page: number | 'all';
}

export interface ExpenseStats {
    total_expenses: number;
    total_amount: number;
    total_paid: number;
    total_due: number;
}

interface ExpensesIndexProps {
    expenses: Paginated<ExpenseListItem>;
    stats: ExpenseStats;
    categories: ExpenseCategoryOption[];
    accounts: Account[];
    filters: ExpenseFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'vendor', label: 'Vendor' },
    { id: 'total', label: 'Total' },
    { id: 'due', label: 'Due' },
    { id: 'status', label: 'Status' },
];

/** Matches `ExpenseExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'expense_date', label: 'Date' },
    { id: 'category', label: 'Category' },
    { id: 'contact', label: 'Vendor' },
    { id: 'total_amount', label: 'Total' },
    { id: 'due_amount', label: 'Due' },
    { id: 'payment_status', label: 'Status' },
    { id: 'note', label: 'Note' },
];

const paymentStatusVariant: Record<PaymentStatusValue, 'secondary' | 'outline' | 'destructive'> = {
    due: 'destructive',
    partial: 'outline',
    paid: 'secondary',
};

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function ExpensesIndex({ expenses, stats, categories, accounts, filters }: ExpensesIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [addOpen, setAddOpen] = useState(false);
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    const [editing, setEditing] = useState<ExpenseListItem | null>(null);
    const [paying, setPaying] = useState<ExpenseListItem | null>(null);

    const { isLoading, applyFilters, handleSort, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'expenses.index',
        filters,
        emptyFilters: { from: null, to: null, expense_category_id: null, payment_status: null },
    });

    // The header's global "Quick Create" menu links here with `?quick_create=1`
    // since there's no standalone /expenses/create page — this opens the same
    // Add Expense modal on arrival instead.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('quick_create') !== '1') return;

        setAddOpen(true);
        params.delete('quick_create');
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    }, []);

    const selection = useTableSelection({
        rows: expenses.data,
        getId: (expense) => expense.id,
    });

    const handleExport = useTableExport({
        routeName: 'expenses.export',
        filters,
        filterKeys: ['from', 'to', 'expense_category_id', 'payment_status'],
        selectedIds: selection.selectedIds,
    });

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('date')) ids.push('expense_date');
        if (isVisible('category')) ids.push('category');
        if (isVisible('vendor')) ids.push('contact');
        if (isVisible('total')) ids.push('total_amount');
        if (isVisible('due')) ids.push('due_amount');
        if (isVisible('status')) ids.push('payment_status');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<ExpenseListItem>[]>(
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
                cell: ({ row }) => (
                    <DataTableRowActions actions={getExpenseActions(row.original, { onEdit: setEditing, onPay: setPaying })} />
                ),
            },
            {
                id: 'date',
                header: () => (
                    <DataTableColumnHeader
                        title="Date"
                        sortKey="expense_date"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                    />
                ),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => row.original.expense_date,
            },
            { id: 'category', header: 'Category', cell: ({ row }) => row.original.category.name },
            {
                id: 'vendor',
                header: 'Vendor',
                cell: ({ row }) => (row.original.contact ? <ContactLink id={row.original.contact.id} name={row.original.contact.name} /> : '—'),
            },
            {
                id: 'total',
                header: () => (
                    <DataTableColumnHeader
                        title="Total"
                        sortKey="total_amount"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_amount),
            },
            {
                id: 'due',
                header: () => (
                    <DataTableColumnHeader
                        title="Due"
                        sortKey="due_amount"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.due_amount),
            },
            {
                id: 'status',
                header: () => (
                    <DataTableColumnHeader
                        title="Status"
                        sortKey="payment_status"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'desc'}
                        onSort={handleSort}
                    />
                ),
                cell: ({ row }) => (
                    <Badge variant={paymentStatusVariant[row.original.payment_status]}>{humanize(row.original.payment_status)}</Badge>
                ),
            },
        ],
        [money, selection, filters.sort, filters.direction, handleSort],
    );

    const renderGridCard = useCallback(
        (expense: ExpenseListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox
                            checked={selection.isSelected(expense.id)}
                            onCheckedChange={(checked) => selection.toggle(expense.id, checked)}
                        />
                        <div className="min-w-0">
                            <div className="font-medium">{expense.category.name}</div>
                            <div className="text-muted-foreground text-xs">
                                {expense.contact ? <ContactLink id={expense.contact.id} name={expense.contact.name} /> : '—'}
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(expense.total_amount)}</span>
                        <DataTableRowActions actions={getExpenseActions(expense, { onEdit: setEditing, onPay: setPaying })} />
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {expense.expense_date}
                        {expense.due_amount > 0 && ` · Due ${money(expense.due_amount)}`}
                    </span>
                    <Badge variant={paymentStatusVariant[expense.payment_status]}>{humanize(expense.payment_status)}</Badge>
                </div>
            </div>
        ),
        [money, selection],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expenses" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Expenses" description="Rent, Utility, Salary, Transport — Purchase-এর মতোই due/partial/paid" />
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
                            Manage Categories
                        </Button>
                        <Button onClick={() => setAddOpen(true)}>Add Expense</Button>
                    </div>
                </div>

                {stats && (
                    <StatCards
                        cards={[
                            {
                                label: 'Total Expenses',
                                value: stats.total_expenses.toLocaleString(),
                                icon: Receipt,
                                tone: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-500/15',
                            },
                            {
                                label: 'Total Amount',
                                value: money(stats.total_amount),
                                icon: DollarSign,
                                tone: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-500/15',
                            },
                            {
                                label: 'Total Paid',
                                value: money(stats.total_paid),
                                icon: ArrowDownCircle,
                                tone: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15',
                            },
                            {
                                label: 'Total Due',
                                value: money(stats.total_due),
                                icon: ArrowUpCircle,
                                tone: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15',
                            },
                        ]}
                    />
                )}

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
                    totalCount={expenses.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <FormInput
                                id="from"
                                label="From"
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) => applyFilters({ from: e.target.value || null })}
                                className="w-40"
                            />
                            <FormInput
                                id="to"
                                label="To"
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) => applyFilters({ to: e.target.value || null })}
                                className="w-40"
                            />

                            <Select
                                value={filters.expense_category_id ? String(filters.expense_category_id) : 'all'}
                                onValueChange={(value) => applyFilters({ expense_category_id: value === 'all' ? null : Number(value) })}
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Category" />
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

                            <Select
                                value={filters.payment_status ?? 'all'}
                                onValueChange={(value) => applyFilters({ payment_status: value === 'all' ? null : (value as PaymentStatusValue) })}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Payment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All payments</SelectItem>
                                    <SelectItem value="due">Due</SelectItem>
                                    <SelectItem value="partial">Partial</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                <DataTable
                    columns={columns}
                    data={expenses.data}
                    getRowKey={(expense) => expense.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title="No expenses yet" description="প্রথম expense যোগ করুন">
                            <Button className="mt-2" onClick={() => setAddOpen(true)}>
                                Add Expense
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No expenses match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={expenses}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="expenses"
                        />
                    }
                />
            </div>

            <ExpenseModal open={addOpen} onOpenChange={setAddOpen} categories={categories} accounts={accounts} />

            {editing && (
                <ExpenseModal
                    open={editing !== null}
                    onOpenChange={(open) => !open && setEditing(null)}
                    categories={categories}
                    accounts={accounts}
                    expense={editing}
                />
            )}

            {paying && (
                <AddExpensePaymentModal open={paying !== null} onOpenChange={(open) => !open && setPaying(null)} expense={paying} accounts={accounts} />
            )}

            <LookupManagerModal
                open={categoriesOpen}
                onOpenChange={setCategoriesOpen}
                title="Expense Categories"
                items={categories}
                storeRouteName="expense-categories.store"
                updateRouteName="expense-categories.update"
                destroyRouteName="expense-categories.destroy"
                parentOptions={categories}
            />
        </AppLayout>
    );
}
