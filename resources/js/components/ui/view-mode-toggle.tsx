import { Button } from '@/components/ui/button';
import { type TableViewMode } from '@/hooks/use-table-view-mode';
import { LayoutGrid, List } from 'lucide-react';

interface ViewModeToggleProps {
    value: TableViewMode;
    onChange: (mode: TableViewMode) => void;
}

/** Pairs with `useTableViewMode` — lives in the page's own filter bar, next to Search/Filters. */
export default function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
    return (
        <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
                type="button"
                variant={value === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="size-7"
                onClick={() => onChange('table')}
                aria-label="Table view"
                aria-pressed={value === 'table'}
            >
                <List className="size-4" />
            </Button>
            <Button
                type="button"
                variant={value === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="size-7"
                onClick={() => onChange('grid')}
                aria-label="Grid view"
                aria-pressed={value === 'grid'}
            >
                <LayoutGrid className="size-4" />
            </Button>
        </div>
    );
}
