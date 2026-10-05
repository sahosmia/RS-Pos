import ListTable from '@/components/data-table/list-table';
import {
    EXPENSE_EXPORT_COLUMN_MAP,
    EXPENSE_EXPORT_COLUMNS,
    EXPENSE_VISIBILITY_COLUMNS,
    useExpenseColumns,
} from '@/components/expenses/expense-columns';
import { ExpenseGridCard } from '@/components/expenses/expense-grid-card';
import ExpenseModal from '@/components/expenses/expense-modal';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import LookupManagerModal from '@/components/products/lookup-manager-modal';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import StatCards from '@/components/shared/stat-cards';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useConfirmDelete } from '@/hooks/use-confirm-delete';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type ExpenseCategoryOption, type ExpenseListItem, type Paginated } from '@/types/models';
import { Head } from '@inertiajs/react';
import { DollarSign, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Expenses', href: '/expenses' }];

interface ExpenseFilters extends TableFilterBase {
    from: string | null;
    to: string | null;
    expense_category_id: number | null;
    per_page: number | 'all';
}

export interface ExpenseStats {
    total_expenses: number;
    total_amount: number;
}

interface ExpensesIndexProps {
    expenses: Paginated<ExpenseListItem>;
    stats: ExpenseStats;
    categories: ExpenseCategoryOption[];
    accounts: Account[];
    filters: ExpenseFilters;
}

export default function ExpensesIndex({ expenses, stats, categories, accounts, filters }: ExpensesIndexProps) {
    const money = useMoneyFormat();
    const [addOpen, setAddOpen] = useState(false);
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    const [editing, setEditing] = useState<ExpenseListItem | null>(null);

    const list = useListPage({
        routeName: 'expenses.index',
        filters,
        emptyFilters: { from: null, to: null, expense_category_id: null },
        rows: expenses.data,
        getId: (expense) => expense.id,
        export: {
            routeName: 'expenses.export',
            filterKeys: ['from', 'to', 'expense_category_id'],
            columnMap: EXPENSE_EXPORT_COLUMN_MAP,
        },
    });

    const deletion = useConfirmDelete<ExpenseListItem>({
        routeName: 'expenses.destroy',
        errorKey: 'expense',
        fallbackError: 'Could not delete expense.',
        successMessage: () => 'Expense deleted.',
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

    const columns = useExpenseColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: list.handleSort,
        selection: list.selection,
        money,
        onEdit: setEditing,
        onDelete: deletion.setTarget,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expenses" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall
                        title="Expenses"
                        description="Rent, Utility, Salary, Transport — যে account থেকে দেওয়া হয়েছে সেখান থেকে সরাসরি কাটা হয়"
                    />
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
                        ]}
                    />
                )}

                <ListTable
                    list={list}
                    data={expenses}
                    filters={filters}
                    columns={columns}
                    getRowKey={(expense) => expense.id}
                    renderGridCard={(expense) => (
                        <ExpenseGridCard
                            expense={expense}
                            selected={list.selection.isSelected(expense.id)}
                            onToggleSelected={(checked) => list.selection.toggle(expense.id, checked)}
                            onEdit={setEditing}
                            onDelete={deletion.setTarget}
                        />
                    )}
                    itemLabel="expenses"
                    visibilityColumns={EXPENSE_VISIBILITY_COLUMNS}
                    exportColumns={EXPENSE_EXPORT_COLUMNS}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <FormInput
                                id="from"
                                label="From"
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) => list.applyFilters({ from: e.target.value || null })}
                                className="w-40"
                            />
                            <FormInput
                                id="to"
                                label="To"
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) => list.applyFilters({ to: e.target.value || null })}
                                className="w-40"
                            />

                            <Select
                                value={filters.expense_category_id ? String(filters.expense_category_id) : 'all'}
                                onValueChange={(value) => list.applyFilters({ expense_category_id: value === 'all' ? null : Number(value) })}
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
                        </div>
                    }
                    emptyState={
                        <EmptyState title="No expenses yet" description="প্রথম expense যোগ করুন">
                            <Button className="mt-2" onClick={() => setAddOpen(true)}>
                                Add Expense
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No expenses match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
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

            <ConfirmDialog
                open={deletion.target !== null}
                onOpenChange={(open) => !open && deletion.setTarget(null)}
                title="Delete Expense?"
                description={`Category "${deletion.target?.category.name}" and amount ${money(deletion.target?.total_amount ?? 0)} analysis entry will be permanently deleted.`}
                confirmLabel="Delete"
                onConfirm={deletion.confirm}
            />
        </AppLayout>
    );
}
