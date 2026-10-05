import { cn } from '@/lib/utils';
import { type ActivityLogEntry } from '@/types/models';

const EVENT_TONE: Record<string, string> = {
    created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    updated: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    deleted: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

/** Created / Updated / Deleted pill. */
export function EventBadge({ event }: { event: string }) {
    return (
        <span
            className={cn(
                'inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                EVENT_TONE[event] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {event}
        </span>
    );
}

/** The fields an entry changed: "Selling Price: ~~500~~ → 550" for updates, the stored values for creates / deletes. */
export function Changes({ entry }: { entry: ActivityLogEntry }) {
    if (entry.changes.length === 0) {
        return <span className="text-muted-foreground/60">—</span>;
    }

    return (
        <ul className="space-y-0.5 text-xs">
            {entry.changes.map((change) => (
                <li key={change.field} className="break-words">
                    <span className="font-medium">{change.field}</span>
                    <span className="text-muted-foreground">: </span>
                    {entry.event === 'updated' && change.old !== null && (
                        <>
                            <span className="text-muted-foreground line-through">{change.old}</span>
                            <span className="text-muted-foreground"> → </span>
                        </>
                    )}
                    <span>{change.new ?? '—'}</span>
                </li>
            ))}
            {entry.more_changes > 0 && <li className="text-muted-foreground">+{entry.more_changes} more</li>}
        </ul>
    );
}
