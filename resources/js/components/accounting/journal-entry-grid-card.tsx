import { getJournalEntryActions } from '@/components/accounting/journal-entry-actions';
import { JournalStatusBadge, referenceLabel } from '@/components/accounting/journal-entry-columns';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDateTime } from '@/lib/format-date';
import { type JournalEntryListItem } from '@/types/models';
import { Link } from '@inertiajs/react';

interface JournalEntryGridCardProps {
    entry: JournalEntryListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onReverse: (entry: JournalEntryListItem) => void;
}

/** One journal entry as a card — the grid view and the mobile list. */
export function JournalEntryGridCard({ entry, selected, onToggleSelected, onReverse }: JournalEntryGridCardProps) {
    const money = useMoneyFormat();

    return (
        <div className="rounded-brand-card bg-card p-3 shadow-[var(--brand-card-shadow-elevated)]">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <div className="min-w-0">
                        <Link href={route('journal-entries.show', entry.id)} className="truncate font-medium underline-offset-2 hover:underline">
                            {entry.description}
                        </Link>
                        <div className="text-muted-foreground text-xs">{referenceLabel(entry)}</div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <JournalStatusBadge status={entry.status} />
                    <DataTableRowActions actions={getJournalEntryActions(entry, { onReverse })} />
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(entry.created_at ?? entry.entry_date)}</span>
                <span className="text-xs tabular-nums">
                    Dr {money(entry.total_debit)} · Cr {money(entry.total_credit)}
                </span>
            </div>
        </div>
    );
}
