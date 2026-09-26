import { getJournalEntryActions } from '@/components/accounting/journal-entry-actions';
import DataTable from '@/components/data-table/data-table';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption } from '@/components/data-table/types';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { FormInput } from '@/components/form/form-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase, useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type ChartOfAccountOption, type JournalEntryListItem, type Paginated } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Journal Entries', href: '/journal-entries' }];

/** No `search`/`sort` here — the backend's `JournalEntryController::index()` doesn't accept either today. */
interface JournalEntryFilters extends TableFilterBase {
    from: string | null;
    to: string | null;
    chart_of_account_id: number | null;
    per_page: number | 'all';
}

interface JournalEntriesIndexProps {
    entries: Paginated<JournalEntryListItem>;
    accounts: ChartOfAccountOption[];
    filters: JournalEntryFilters;
}

const getVisibilityColumns = (): DataTableColumnOption[] => [
    { id: 'date', label: 'Date' },
    { id: 'description', label: 'Description' },
    { id: 'reference', label: 'Reference' },
    { id: 'status', label: 'Status' },
    { id: 'debit', label: 'Debit' },
    { id: 'credit', label: 'Credit' },
];

/** Matches `JournalEntryExportController::COLUMN_LABELS` on the backend. */
const getExportColumns = (): DataTableColumnOption[] => [
    { id: 'entry_date', label: 'Date' },
    { id: 'description', label: 'Description' },
    { id: 'reference', label: 'Reference' },
    { id: 'status', label: 'Status' },
    { id: 'total_debit', label: 'Debit' },
    { id: 'total_credit', label: 'Credit' },
];

export default function JournalEntriesIndex({ entries, accounts, filters }: JournalEntriesIndexProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [reversing, setReversing] = useState<JournalEntryListItem | null>(null);
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const { isLoading, applyFilters, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'journal-entries.index',
        filters,
        emptyFilters: { from: null, to: null, chart_of_account_id: null },
    });

    const selection = useTableSelection({
        rows: entries.data,
        getId: (entry) => entry.id,
    });

    const handleExport = useTableExport({
        routeName: 'journal-entries.export',
        filters,
        filterKeys: ['from', 'to', 'chart_of_account_id'],
        selectedIds: selection.selectedIds,
    });

    const openReverse = (entry: JournalEntryListItem) => {
        setReason('');
        setReversing(entry);
    };

    const confirmReverse = () => {
        if (!reversing) {
            return;
        }

        setProcessing(true);
        router.post(
            route('journal-entries.reverse', reversing.id),
            { reason },
            {
                onFinish: () => {
                    setProcessing(false);
                    setReversing(null);
                },
            },
        );
    };

    // Table-column visibility → which fine-grained export columns should start checked.
    const defaultExportColumns = useMemo(() => {
        const isVisible = (id: string) => columnVisibility[id] !== false;
        const ids: string[] = [];

        if (isVisible('date')) ids.push('entry_date');
        if (isVisible('description')) ids.push('description');
        if (isVisible('reference')) ids.push('reference');
        if (isVisible('status')) ids.push('status');
        if (isVisible('debit')) ids.push('total_debit');
        if (isVisible('credit')) ids.push('total_credit');

        return ids;
    }, [columnVisibility]);

    const columns = useMemo<ColumnDef<JournalEntryListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getJournalEntryActions(row.original, { onReverse: openReverse })} />,
            },
            {
                id: 'date',
                header: 'Date',
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => row.original.entry_date,
            },
            {
                id: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <Link href={route('journal-entries.show', row.original.id)} className="underline-offset-2 hover:underline">
                        {row.original.description}
                    </Link>
                ),
            },
            {
                id: 'reference',
                header: 'Reference',
                cell: ({ row }) => (
                    <span className="text-muted-foreground">
                        {row.original.reference_type ? `${row.original.reference_type} #${row.original.reference_id}` : '—'}
                    </span>
                ),
            },
            {
                id: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <Badge variant={row.original.status === 'reversed' ? 'outline' : 'secondary'}>
                        {row.original.status === 'reversed' ? 'Reversed' : 'Posted'}
                    </Badge>
                ),
            },
            {
                id: 'debit',
                header: 'Debit',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_debit),
            },
            {
                id: 'credit',
                header: 'Credit',
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.total_credit),
            },
        ],
        [money, selection],
    );

    const renderGridCard = useCallback(
        (entry: JournalEntryListItem) => (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox checked={selection.isSelected(entry.id)} onCheckedChange={(checked) => selection.toggle(entry.id, checked)} />
                        <div className="min-w-0">
                            <Link href={route('journal-entries.show', entry.id)} className="truncate font-medium underline-offset-2 hover:underline">
                                {entry.description}
                            </Link>
                            <div className="text-muted-foreground text-xs">
                                {entry.reference_type ? `${entry.reference_type} #${entry.reference_id}` : '—'}
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <Badge variant={entry.status === 'reversed' ? 'outline' : 'secondary'}>
                            {entry.status === 'reversed' ? 'Reversed' : 'Posted'}
                        </Badge>
                        <DataTableRowActions actions={getJournalEntryActions(entry, { onReverse: openReverse })} />
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">{entry.entry_date}</span>
                    <span className="text-xs tabular-nums">
                        Dr {money(entry.total_debit)} · Cr {money(entry.total_credit)}
                    </span>
                </div>
            </div>
        ),
        [money, selection],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Journal Entries" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Journal Entries" description="General Ledger-এ পোস্ট হওয়া প্রতিটা balanced entry" />

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
                                value={filters.chart_of_account_id ? String(filters.chart_of_account_id) : 'all'}
                                onValueChange={(value) => applyFilters({ chart_of_account_id: value === 'all' ? null : Number(value) })}
                            >
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All accounts</SelectItem>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={String(account.id)}>
                                            {account.code} — {account.name}
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
                        <EmptyState title="No journal entries yet" description="Purchase/Sale/Fund Transfer confirm করলে এখানে দেখা যাবে" />
                    }
                    filteredEmptyState={
                        <EmptyState title="No journal entries match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
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

            <ConfirmDialog
                open={reversing !== null}
                onOpenChange={(open) => !open && setReversing(null)}
                title="Reverse this journal entry?"
                description="একটা নতুন mirrored entry (debit/credit উল্টে) পোস্ট হবে, আর এই entry-টা reversed হিসেবে মার্ক হবে — original কখনো এডিট/ডিলিট হয় না।"
                confirmLabel="Reverse"
                processing={processing}
                confirmDisabled={reason.trim() === ''}
                onConfirm={confirmReverse}
            >
                <div className="pt-2">
                    <FormInput id="reason" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
                </div>
            </ConfirmDialog>
        </AppLayout>
    );
}
