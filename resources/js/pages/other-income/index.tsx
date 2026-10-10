import ListTable from '@/components/data-table/list-table';
import OtherIncomeCategoryManager from '@/components/other-income/category-manager';
import {
    INCOME_EXPORT_COLUMN_MAP,
    INCOME_EXPORT_COLUMNS,
    INCOME_VISIBILITY_COLUMNS,
    useIncomeColumns,
} from '@/components/other-income/income-columns';
import { IncomeFormModal } from '@/components/other-income/income-form-modal';
import { IncomeGridCard } from '@/components/other-income/income-grid-card';
import BulkDeleteBar from '@/components/shared/bulk-delete-bar';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { MetricCard } from '@/components/shared/metric-card';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useConfirmDelete } from '@/hooks/use-confirm-delete';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type OtherIncomeCategoryRow, type OtherIncomeListItem, type Paginated } from '@/types/models';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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

export default function OtherIncomeIndex({ incomes, totalIncome, categories, accounts, filters }: OtherIncomeIndexProps) {
    const money = useMoneyFormat();
    const [tab, setTab] = useState<'income' | 'categories'>('income');
    const [modalOpen, setModalOpen] = useState(false);

    const list = useListPage({
        routeName: 'other-income.index',
        filters,
        emptyFilters: { category_id: null },
        rows: incomes.data,
        getId: (income) => income.id,
        export: { routeName: 'other-income.export', filterKeys: ['category_id'], columnMap: INCOME_EXPORT_COLUMN_MAP },
    });

    const deletion = useConfirmDelete<OtherIncomeListItem>({
        routeName: 'other-income.destroy',
        errorKey: 'income',
        fallbackError: 'Could not delete this income.',
        successMessage: () => 'Income deleted — the account and journal were reversed.',
    });

    // Quick actions (Ctrl+Space) link here with `?quick_create=1` to open the Add Income modal on arrival.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('quick_create') !== '1') return;

        setModalOpen(true);
        params.delete('quick_create');
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    }, []);

    const columns = useIncomeColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: list.handleSort,
        selection: list.selection,
        money,
        onDelete: deletion.setTarget,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Other Income" />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    title="Other Income"
                    description="বিক্রি ছাড়া ছোট আয় — যেমন কার্টন/স্ক্র্যাপ বিক্রি, সুদ, কমিশন"
                    actions={<>{tab === 'income' && <Button onClick={() => setModalOpen(true)}>Add Income</Button>}</>}
                />

                <Tabs value={tab} onValueChange={(value) => setTab(value === 'categories' ? 'categories' : 'income')}>
                    <TabsList>
                        <TabsTrigger value="income">Income</TabsTrigger>
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                    </TabsList>
                </Tabs>

                {tab === 'income' ? (
                    <>
                        <MetricCard
                            label={list.activeFilterCount > 0 ? 'Total (filtered)' : 'Total other income'}
                            value={money(totalIncome)}
                            accent="success"
                            className="sm:max-w-xs"
                        />

                        <ListTable
                            selectionSlot={
                                <BulkDeleteBar
                                    selection={list.selection}
                                    routeName="other-income.bulk-delete"
                                    noun="income records"
                                    permission="expense.delete"
                                />
                            }
                            list={list}
                            data={incomes}
                            filters={filters}
                            columns={columns}
                            getRowKey={(income) => income.id}
                            renderGridCard={(income) => (
                                <IncomeGridCard
                                    income={income}
                                    selected={list.selection.isSelected(income.id)}
                                    onToggleSelected={(checked) => list.selection.toggle(income.id, checked)}
                                />
                            )}
                            itemLabel="entries"
                            visibilityColumns={INCOME_VISIBILITY_COLUMNS}
                            exportColumns={INCOME_EXPORT_COLUMNS}
                            filterSlot={
                                <div className="grid min-w-0 content-start gap-2">
                                    <Label htmlFor="category_filter">Category</Label>
                                    <Select
                                        value={filters.category_id ? String(filters.category_id) : 'all'}
                                        onValueChange={(value) => list.applyFilters({ category_id: value === 'all' ? null : Number(value) })}
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
                            emptyState={
                                <EmptyState title="No income yet" description="কার্টন বা স্ক্র্যাপ বিক্রির মতো ছোট আয় এখানে লিখে রাখুন">
                                    <Button className="mt-2" onClick={() => setModalOpen(true)}>
                                        Add Income
                                    </Button>
                                </EmptyState>
                            }
                            filteredEmptyState={
                                <EmptyState title="No income matches your filters" description="অন্য category দিয়ে আবার চেষ্টা করুন">
                                    <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                        Clear filters
                                    </Button>
                                </EmptyState>
                            }
                        />
                    </>
                ) : (
                    <OtherIncomeCategoryManager categories={categories} />
                )}
            </div>

            <IncomeFormModal open={modalOpen} onOpenChange={setModalOpen} categories={categories} accounts={accounts} />

            <ConfirmDialog
                open={deletion.target !== null}
                onOpenChange={(open) => !open && deletion.setTarget(null)}
                title="Delete this income?"
                description={`${deletion.target ? money(deletion.target.amount) : ''} (${deletion.target?.category.name ?? ''}) মুছে ফেলা হবে — account থেকে টাকাটা কমবে আর journal reverse হবে।`}
                confirmLabel="Delete"
                onConfirm={deletion.confirm}
            />
        </AppLayout>
    );
}
