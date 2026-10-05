import { LOAN_EXPORT_COLUMN_MAP, LOAN_EXPORT_COLUMNS, LOAN_VISIBILITY_COLUMNS, useLoanColumns } from '@/components/company-loans/loan-columns';
import { LoanFormModal } from '@/components/company-loans/loan-form-modal';
import { LoanGridCard } from '@/components/company-loans/loan-grid-card';
import ListTable from '@/components/data-table/list-table';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useConfirmDelete } from '@/hooks/use-confirm-delete';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CompanyLoanListItem, type Paginated } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Investors', href: '/investors' },
    { title: 'Company Loans', href: '/company-loans' },
];

interface CompanyLoanFilters extends TableFilterBase {
    per_page: number | 'all';
}

interface CompanyLoansIndexProps {
    loans: Paginated<CompanyLoanListItem>;
    totalOutstanding: number;
    accounts: Account[];
    filters: CompanyLoanFilters;
}

export default function CompanyLoansIndex({ loans, totalOutstanding, accounts, filters }: CompanyLoansIndexProps) {
    const money = useMoneyFormat();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CompanyLoanListItem | null>(null);

    const list = useListPage({
        routeName: 'company-loans.index',
        filters,
        rows: loans.data,
        getId: (loan) => loan.id,
        export: { routeName: 'company-loans.export', filterKeys: [], columnMap: LOAN_EXPORT_COLUMN_MAP },
    });

    const deletion = useConfirmDelete<CompanyLoanListItem>({
        routeName: 'company-loans.destroy',
        errorKey: 'company_loan',
        fallbackError: 'Could not delete loan.',
        label: (loan) => loan.lender_name,
    });

    const openForm = (loan: CompanyLoanListItem | null) => {
        setEditing(loan);
        setModalOpen(true);
    };

    const columns = useLoanColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: list.handleSort,
        selection: list.selection,
        money,
        onEdit: openForm,
        onDelete: deletion.setTarget,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Company Loans" />

            <div className="space-y-6 px-4 py-6">
                <Tabs value="/company-loans" onValueChange={(url) => router.visit(url)}>
                    <TabsList>
                        <TabsTrigger value="/investors">Investors</TabsTrigger>
                        <TabsTrigger value="/company-loans">Company Loans</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Company Loans" description="ব্যাংক বা ব্যক্তির কাছ থেকে নেওয়া ঋণ" />
                    <Button onClick={() => openForm(null)}>Add Loan</Button>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Total outstanding</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(totalOutstanding)}</p>
                </div>

                <ListTable
                    list={list}
                    data={loans}
                    filters={filters}
                    columns={columns}
                    getRowKey={(loan) => loan.id}
                    renderGridCard={(loan) => (
                        <LoanGridCard
                            loan={loan}
                            selected={list.selection.isSelected(loan.id)}
                            onToggleSelected={(checked) => list.selection.toggle(loan.id, checked)}
                            onEdit={openForm}
                            onDelete={deletion.setTarget}
                        />
                    )}
                    itemLabel="loans"
                    visibilityColumns={LOAN_VISIBILITY_COLUMNS}
                    exportColumns={LOAN_EXPORT_COLUMNS}
                    emptyState={
                        <EmptyState title="No loans yet" description="প্রথম loan যোগ করুন">
                            <Button className="mt-2" onClick={() => openForm(null)}>
                                Add Loan
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No loans match your filters" description="অন্য filter দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                />
            </div>

            <LoanFormModal open={modalOpen} onOpenChange={setModalOpen} editing={editing} accounts={accounts} />

            <ConfirmDialog
                open={deletion.target !== null}
                onOpenChange={(open) => !open && deletion.setTarget(null)}
                title="Delete loan?"
                description={`"${deletion.target?.lender_name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={deletion.confirm}
            />
        </AppLayout>
    );
}
