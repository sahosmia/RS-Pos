import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import { getCompanyLoanActions } from '@/components/company-loans/company-loan-actions';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { today } from '@/lib/format-date';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Account, type CompanyLoanListItem, type Paginated } from '@/types/models';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { FormEventHandler, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Investors', href: '/investors' }, { title: 'Company Loans', href: '/company-loans' }];

interface CompanyLoanFilters extends TableFilterBase {
    per_page: number | 'all';
}

interface CompanyLoansIndexProps {
    loans: Paginated<CompanyLoanListItem>;
    totalOutstanding: number;
    accounts: Account[];
    filters: CompanyLoanFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'lender', label: 'Lender' },
    { id: 'loan_amount', label: 'Loan Amount' },
    { id: 'interest_rate', label: 'Interest' },
    { id: 'outstanding_balance', label: 'Outstanding' },
    { id: 'start_date', label: 'Start Date' },
];

/** Matches `CompanyLoanExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'lender_name', label: 'Lender' },
    { id: 'loan_amount', label: 'Loan Amount' },
    { id: 'interest_rate', label: 'Interest Rate' },
    { id: 'outstanding_balance', label: 'Outstanding' },
    { id: 'start_date', label: 'Start Date' },
];

export default function CompanyLoansIndex({ loans, totalOutstanding, accounts, filters }: CompanyLoansIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CompanyLoanListItem | null>(null);
    const [deleting, setDeleting] = useState<CompanyLoanListItem | null>(null);

    const { isLoading, applyFilters, handleSort, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'company-loans.index',
        filters,
    });

    const selection = useTableSelection({
        rows: loans.data,
        getId: (loan) => loan.id,
    });

    const handleExport = useTableExport({
        routeName: 'company-loans.export',
        filters,
        filterKeys: [],
        selectedIds: selection.selectedIds,
    });

    const emptyForm = {
        loan_type: 'existing' as 'existing' | 'new',
        lender_name: '',
        loan_amount: 0,
        current_balance: 0,
        account_id: null as number | null,
        interest_rate: null as number | null,
        start_date: today(),
    };

    const form = useForm(emptyForm);

    const openCreate = () => {
        form.clearErrors();
        form.setData({ ...emptyForm, account_id: accounts.find((account) => account.is_default)?.id ?? accounts[0]?.id ?? null });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = useCallback(
        (loan: CompanyLoanListItem) => {
            form.clearErrors();
            form.setData({
                loan_type: 'existing',
                current_balance: 0,
                account_id: null,
                lender_name: loan.lender_name,
                loan_amount: loan.loan_amount,
                interest_rate: loan.interest_rate,
                start_date: loan.start_date,
            });
            setEditing(loan);
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
                toast.success(isEditing ? 'Loan updated.' : 'Loan added.');
                setModalOpen(false);
            },
        };

        if (editing) {
            form.patch(route('company-loans.update', editing.id), options);
        } else {
            form.post(route('company-loans.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        const name = deleting.lender_name;

        router.delete(route('company-loans.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${name}" deleted.`),
            onError: (errors) => toast.error(errors.company_loan ?? 'Could not delete loan.'),
            onFinish: () => setDeleting(null),
        });
    };

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('lender')) ids.push('lender_name');
        if (isVisible('loan_amount')) ids.push('loan_amount');
        if (isVisible('interest_rate')) ids.push('interest_rate');
        if (isVisible('outstanding_balance')) ids.push('outstanding_balance');
        if (isVisible('start_date')) ids.push('start_date');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<CompanyLoanListItem>[]>(
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
                    <DataTableRowActions actions={getCompanyLoanActions(row.original, { onEdit: openEdit, onDelete: setDeleting })} />
                ),
            },
            {
                id: 'lender',
                header: () => (
                    <DataTableColumnHeader
                        title="Lender"
                        sortKey="lender_name"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'asc'}
                        onSort={handleSort}
                    />
                ),
                cell: ({ row }) => (
                    <Link href={route('company-loans.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.lender_name}
                    </Link>
                ),
            },
            {
                id: 'loan_amount',
                header: () => (
                    <DataTableColumnHeader
                        title="Loan Amount"
                        sortKey="loan_amount"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'asc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.loan_amount),
            },
            {
                id: 'interest_rate',
                header: 'Interest',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => (row.original.interest_rate ? `${row.original.interest_rate}%` : '—'),
            },
            {
                id: 'outstanding_balance',
                header: () => (
                    <DataTableColumnHeader
                        title="Outstanding"
                        sortKey="current_balance"
                        currentSort={filters.sort ?? ''}
                        currentDirection={filters.direction ?? 'asc'}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.outstanding_balance),
            },
            {
                id: 'start_date',
                header: 'Start Date',
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => row.original.start_date,
            },
        ],
        [money, selection, openEdit, filters.sort, filters.direction, handleSort],
    );

    const renderGridCard = useCallback(
        (loan: CompanyLoanListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox checked={selection.isSelected(loan.id)} onCheckedChange={(checked) => selection.toggle(loan.id, checked)} />
                        <div className="min-w-0">
                            <Link href={route('company-loans.show', loan.id)} className="truncate font-medium underline-offset-2 hover:underline">
                                {loan.lender_name}
                            </Link>
                            <div className="text-muted-foreground text-xs">{loan.start_date}</div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(loan.loan_amount)}</span>
                        <DataTableRowActions actions={getCompanyLoanActions(loan, { onEdit: openEdit, onDelete: setDeleting })} />
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {loan.interest_rate ? `${loan.interest_rate}% interest` : 'No interest'}
                    </span>
                    <span className="font-medium tabular-nums">{money(loan.outstanding_balance)}</span>
                </div>
            </div>
        ),
        [money, selection, openEdit],
    );

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
                    <Button onClick={openCreate}>Add Loan</Button>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Total outstanding</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(totalOutstanding)}</p>
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
                    totalCount={loans.total}
                    selectedCount={selection.selectedIds.length}
                    onExport={handleExport}
                />

                <DataTable
                    columns={columns}
                    data={loans.data}
                    getRowKey={(loan) => loan.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    columnVisibility={columnVisibility}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={
                        <EmptyState title="No loans yet" description="প্রথম loan যোগ করুন">
                            <Button className="mt-2" onClick={openCreate}>
                                Add Loan
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No loans match your filters" description="অন্য filter দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={loans}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="loans"
                        />
                    }
                />
            </div>

            <FormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Edit Loan' : 'Add Loan'}
                processing={form.processing}
                onSubmit={submit}
            >
                {!editing && (
                    <FormSelect
                        id="loan_type"
                        label="Loan Type"
                        value={form.data.loan_type}
                        onChange={(value) => form.setData('loan_type', value === 'new' ? 'new' : 'existing')}
                        options={[
                            { value: 'existing', label: 'Existing loan — আগে থেকেই চলছে' },
                            { value: 'new', label: 'New loan — এখন টাকা পেলাম' },
                        ]}
                        required
                    />
                )}

                <FormInput
                    id="lender_name"
                    label="Lender"
                    value={form.data.lender_name}
                    onChange={(e) => form.setData('lender_name', e.target.value)}
                    error={form.errors.lender_name}
                    required
                />

                <MoneyInput
                    id="loan_amount"
                    label={!editing && form.data.loan_type === 'existing' ? 'Original Loan Amount' : 'Loan Amount'}
                    value={form.data.loan_amount}
                    onChange={(e) => form.setData('loan_amount', Number(e.target.value))}
                    error={form.errors.loan_amount}
                    required
                />

                {!editing && form.data.loan_type === 'existing' && (
                    <MoneyInput
                        id="current_balance"
                        label="Current Outstanding Balance"
                        value={form.data.current_balance}
                        onChange={(e) => form.setData('current_balance', Number(e.target.value))}
                        error={form.errors.current_balance}
                        helperText="এখন যতটা বাকি আছে — এটাই opening balance হিসেবে যাবে। কোনো account-এ হিট করবে না।"
                        required
                    />
                )}

                {!editing && form.data.loan_type === 'new' && (
                    <FormSelect
                        id="account_id"
                        label="Received Into Account"
                        value={form.data.account_id}
                        onChange={(value) => form.setData('account_id', value ? Number(value) : null)}
                        options={accounts.map((account) => ({ value: String(account.id), label: account.name }))}
                        placeholder="Select account"
                        error={form.errors.account_id}
                        helperText="Loan-এর টাকা এই account-এ জমা হবে।"
                        required
                    />
                )}

                <FormInput
                    id="interest_rate"
                    label="Interest Rate (%)"
                    type="number"
                    step="0.01"
                    value={form.data.interest_rate ?? ''}
                    onChange={(e) => form.setData('interest_rate', e.target.value === '' ? null : Number(e.target.value))}
                    error={form.errors.interest_rate}
                    helperText="শুধু তথ্যের জন্য — কোনো automatic হিসাব হবে না।"
                />

                <FormInput
                    id="start_date"
                    label="Start Date"
                    type="date"
                    value={form.data.start_date}
                    onChange={(e) => form.setData('start_date', e.target.value)}
                    error={form.errors.start_date}
                    required
                />
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete loan?"
                description={`"${deleting?.lender_name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
