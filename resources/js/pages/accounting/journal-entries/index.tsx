import {
    JOURNAL_EXPORT_COLUMN_MAP,
    JOURNAL_EXPORT_COLUMNS,
    JOURNAL_VISIBILITY_COLUMNS,
    useJournalEntryColumns,
} from '@/components/accounting/journal-entry-columns';
import { JournalEntryGridCard } from '@/components/accounting/journal-entry-grid-card';
import { ReverseEntryDialog } from '@/components/accounting/reverse-entry-dialog';
import ListTable from '@/components/data-table/list-table';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type ChartOfAccountOption, type JournalEntryListItem, type Paginated } from '@/types/models';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Journal Entries', href: '/journal-entries' }];

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

export default function JournalEntriesIndex({ entries, accounts, filters }: JournalEntriesIndexProps) {
    const money = useMoneyFormat();
    const [reversing, setReversing] = useState<JournalEntryListItem | null>(null);

    const list = useListPage({
        routeName: 'journal-entries.index',
        filters,
        emptyFilters: { from: null, to: null, chart_of_account_id: null },
        rows: entries.data,
        getId: (entry) => entry.id,
        export: {
            routeName: 'journal-entries.export',
            filterKeys: ['from', 'to', 'chart_of_account_id'],
            columnMap: JOURNAL_EXPORT_COLUMN_MAP,
        },
    });

    const columns = useJournalEntryColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: list.handleSort,
        selection: list.selection,
        money,
        onReverse: setReversing,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Journal Entries" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Journal Entries" description="General Ledger-এ পোস্ট হওয়া প্রতিটা balanced entry" />

                <ListTable
                    list={list}
                    data={entries}
                    filters={filters}
                    columns={columns}
                    getRowKey={(entry) => entry.id}
                    renderGridCard={(entry) => (
                        <JournalEntryGridCard
                            entry={entry}
                            selected={list.selection.isSelected(entry.id)}
                            onToggleSelected={(checked) => list.selection.toggle(entry.id, checked)}
                            onReverse={setReversing}
                        />
                    )}
                    itemLabel="entries"
                    visibilityColumns={JOURNAL_VISIBILITY_COLUMNS}
                    exportColumns={JOURNAL_EXPORT_COLUMNS}
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
                                value={filters.chart_of_account_id ? String(filters.chart_of_account_id) : 'all'}
                                onValueChange={(value) => list.applyFilters({ chart_of_account_id: value === 'all' ? null : Number(value) })}
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
                    emptyState={<EmptyState title="No journal entries yet" description="Purchase/Sale/Fund Transfer confirm করলে এখানে দেখা যাবে" />}
                    filteredEmptyState={
                        <EmptyState title="No journal entries match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                />
            </div>

            <ReverseEntryDialog entry={reversing} onClose={() => setReversing(null)} />
        </AppLayout>
    );
}
