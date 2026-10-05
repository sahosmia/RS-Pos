import { Changes, EventBadge } from '@/components/activity-log/activity-entry-parts';
import { formatDateTime } from '@/lib/format-date';
import { type ActivityLogEntry } from '@/types/models';
import { type ColumnDef } from '@tanstack/react-table';

/** Columns of the activity log table: when, who, what was done, to which record, the changes, and from where. */
export const ACTIVITY_COLUMNS: ColumnDef<ActivityLogEntry>[] = [
    {
        id: 'when',
        header: 'When',
        meta: { cellClassName: 'whitespace-nowrap align-top' },
        cell: ({ row }) => formatDateTime(row.original.created_at),
    },
    {
        id: 'user',
        header: 'User',
        meta: { cellClassName: 'align-top' },
        cell: ({ row }) => row.original.user ?? <span className="text-muted-foreground">System</span>,
    },
    { id: 'event', header: 'Action', meta: { cellClassName: 'align-top' }, cell: ({ row }) => <EventBadge event={row.original.event} /> },
    {
        id: 'record',
        header: 'Record',
        meta: { cellClassName: 'align-top' },
        cell: ({ row }) => (
            <div>
                <div className="font-medium">{row.original.record}</div>
                <div className="text-muted-foreground text-xs">{row.original.record_type}</div>
            </div>
        ),
    },
    { id: 'changes', header: 'Changes', meta: { cellClassName: 'max-w-md align-top' }, cell: ({ row }) => <Changes entry={row.original} /> },
    {
        id: 'ip',
        header: 'IP',
        meta: { cellClassName: 'text-muted-foreground align-top text-xs whitespace-nowrap' },
        cell: ({ row }) => row.original.ip_address ?? '—',
    },
];
