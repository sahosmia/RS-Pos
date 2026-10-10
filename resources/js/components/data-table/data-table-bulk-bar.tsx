import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';

interface DataTableBulkBarProps {
    selectedCount: number;
    /** Noun for the count, e.g. "products" → "3 products selected". */
    itemLabel?: string;
    onClear: () => void;
    /** The bulk actions (Buttons), shown on the right. */
    children?: ReactNode;
    className?: string;
}

/**
 * Contextual bar shown only while rows are selected. Generic: the page supplies the actions as children
 * and wires `selectedCount`/`onClear` from `useTableSelection`. Renders nothing when the selection is empty.
 */
export default function DataTableBulkBar({ selectedCount, itemLabel = 'selected', onClear, children, className }: DataTableBulkBarProps) {
    if (selectedCount === 0) {
        return null;
    }

    return (
        <div
            role="region"
            aria-label="Bulk actions"
            className={cn(
                'rounded-brand-control bg-brand-table-row-selected border-brand-primary/25 flex flex-wrap items-center justify-between gap-2 border px-3 py-1.5 print:hidden',
                className,
            )}
        >
            <p className="text-sm font-medium tabular-nums" aria-live="polite">
                {selectedCount} {itemLabel === 'selected' ? 'selected' : `${itemLabel} selected`}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
                {children}
                <Button type="button" variant="ghost" size="icon-sm" onClick={onClear} title="Clear selection" aria-label="Clear selection">
                    <X />
                </Button>
            </div>
        </div>
    );
}
