import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type JournalEntryListItem } from '@/types/models';
import { Eye, Undo2 } from 'lucide-react';

interface JournalEntryActionHandlers {
    onReverse: (entry: JournalEntryListItem) => void;
}

/**
 * Row actions for the Journal Entries list's action menu. There's no
 * edit/delete here on purpose — a posted entry is never mutated or removed,
 * only ever reversed via a mirrored correcting entry (see `JournalService`
 * and `JournalEntryController::reverse()`), and only while it's still
 * `posted` and isn't itself a reversal (an original that's already been
 * reversed, or a reversal entry, can't be reversed again).
 */
export function getJournalEntryActions(entry: JournalEntryListItem, { onReverse }: JournalEntryActionHandlers): RowAction[] {
    return [
        { label: 'View', icon: Eye, href: route('journal-entries.show', entry.id) },
        {
            label: 'Reverse',
            icon: Undo2,
            onClick: () => onReverse(entry),
            hidden: entry.status !== 'posted' || entry.is_reversal,
        },
    ];
}
