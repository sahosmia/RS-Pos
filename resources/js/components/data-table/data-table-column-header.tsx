import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

interface DataTableColumnHeaderProps {
    title: string;
    sortKey: string;
    currentSort: string;
    currentDirection: 'asc' | 'desc';
    onSort: (key: string) => void;
    align?: 'left' | 'right';
}

/**
 * Clickable column header for a sortable column — click toggles asc/desc,
 * clicking a different column starts it at asc. Replaces a separate "Sort"
 * dropdown; only columns the backend actually accepts as a `sort` value
 * should render this (others stay plain text headers).
 */
export default function DataTableColumnHeader({ title, sortKey, currentSort, currentDirection, onSort, align = 'left' }: DataTableColumnHeaderProps) {
    const isActive = currentSort === sortKey;
    const Icon = isActive ? (currentDirection === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;

    // Announces sortability, current direction, and what activating it does
    // next — the visual icon alone doesn't convey any of that to a screen reader.
    const ariaLabel = isActive
        ? `Sorted by ${title}, ${currentDirection === 'asc' ? 'ascending' : 'descending'}. Activate to sort ${currentDirection === 'asc' ? 'descending' : 'ascending'}.`
        : `Sort by ${title}`;

    return (
        <button
            type="button"
            onClick={() => onSort(sortKey)}
            aria-label={ariaLabel}
            className={cn(
                'hover:text-foreground focus-visible:ring-brand-focus-ring motion-colors -mx-1 inline-flex items-center gap-1 rounded-sm px-1 font-semibold tracking-wide outline-hidden focus-visible:ring-2',
                isActive && 'text-foreground',
                align === 'right' && 'flex-row-reverse',
            )}
        >
            {title}
            <Icon aria-hidden="true" className={cn('size-3.5', isActive ? 'text-brand-primary' : 'text-muted-foreground/40')} />
        </button>
    );
}
