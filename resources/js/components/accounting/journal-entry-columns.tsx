import { getJournalEntryActions } from '@/components/accounting/journal-entry-actions';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Badge } from '@/components/ui/badge';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { formatDateTime } from '@/lib/format-date';
import { type JournalEntryListItem } from '@/types/models';
import { Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const JOURNAL_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'date', label: 'Date' },
    { id: 'description', label: 'Description' },
    { id: 'reference', label: 'Reference' },
    { id: 'status', label: 'Status' },
    { id: 'debit', label: 'Debit' },
    { id: 'credit', label: 'Credit' },
];

/** Matches `JournalEntryExportController::COLUMN_LABELS` on the backend. */
export const JOURNAL_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'entry_date', label: 'Date' },
    { id: 'description', label: 'Description' },
    { id: 'reference', label: 'Reference' },
    { id: 'status', label: 'Status' },
    { id: 'total_debit', label: 'Debit' },
    { id: 'total_credit', label: 'Credit' },
];

/** Table column → export columns that start ticked while it's visible. */
export const JOURNAL_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    date: ['entry_date'],
    description: ['description'],
    reference: ['reference'],
    status: ['status'],
    debit: ['total_debit'],
    credit: ['total_credit'],
};

export const referenceLabel = (entry: JournalEntryListItem) => (entry.reference_type ? `${entry.reference_type} #${entry.reference_id}` : '—');

export function JournalStatusBadge({ status }: { status: JournalEntryListItem['status'] }) {
    return <Badge variant={status === 'reversed' ? 'outline' : 'secondary'}>{status === 'reversed' ? 'Reversed' : 'Posted'}</Badge>;
}

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    onReverse: (entry: JournalEntryListItem) => void;
}

export function useJournalEntryColumns({ sort, direction = 'desc', onSort, selection, money, onReverse }: Options) {
    return useMemo<ColumnDef<JournalEntryListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getJournalEntryActions(row.original, { onReverse })} />,
            },
            {
                id: 'date',
                header: () => (
                    <DataTableColumnHeader title="Date" sortKey="entry_date" currentSort={sort ?? ''} currentDirection={direction} onSort={onSort} />
                ),
                meta: { cellClassName: 'whitespace-nowrap', label: 'Date & Time' },
                cell: ({ row }) => formatDateTime(row.original.created_at ?? row.original.entry_date),
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
                cell: ({ row }) => <span className="text-muted-foreground">{referenceLabel(row.original)}</span>,
            },
            { id: 'status', header: 'Status', cell: ({ row }) => <JournalStatusBadge status={row.original.status} /> },
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
        [money, selection, sort, direction, onSort, onReverse],
    );
}
