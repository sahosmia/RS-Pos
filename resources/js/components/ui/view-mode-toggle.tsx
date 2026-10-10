import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type TableViewMode } from '@/hooks/use-table-view-mode';
import { LayoutGrid, List } from 'lucide-react';

interface ViewModeToggleProps {
    value: TableViewMode;
    onChange: (mode: TableViewMode) => void;
}

/** Pairs with `useTableViewMode` — lives in the page's own filter bar, next to Search/Filters. */
export default function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
    return (
        <div className="rounded-brand-control bg-brand-secondary flex items-center gap-0.5 p-0.5">
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn('size-7', value === 'table' && 'bg-card text-foreground shadow-xs hover:bg-card')}
                onClick={() => onChange('table')}
                aria-label="Table view"
                aria-pressed={value === 'table'}
            >
                <List className="size-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn('size-7', value === 'grid' && 'bg-card text-foreground shadow-xs hover:bg-card')}
                onClick={() => onChange('grid')}
                aria-label="Grid view"
                aria-pressed={value === 'grid'}
            >
                <LayoutGrid className="size-4" />
            </Button>
        </div>
    );
}
