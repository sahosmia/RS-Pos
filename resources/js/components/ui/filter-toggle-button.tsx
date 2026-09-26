import { Badge } from '@/components/ui/badge';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, Filter } from 'lucide-react';
import * as React from 'react';

interface FilterToggleButtonProps extends Omit<ButtonProps, 'children'> {
    open: boolean;
    /** Count of filters currently applied (excludes free-text search, sort, pagination). */
    activeCount?: number;
}

/**
 * Pair with `CollapsibleTrigger asChild` — the extra dropdown filters (category,
 * status, date range, ...) live behind this, collapsed by default, FAQ-item style.
 * Must forward the ref/onClick etc. Radix's `asChild` injects, otherwise the
 * trigger silently does nothing when clicked.
 */
const FilterToggleButton = React.forwardRef<HTMLButtonElement, FilterToggleButtonProps>(({ open, activeCount = 0, className, ...props }, ref) => {
    return (
        <Button ref={ref} type="button" variant="outline" className={cn('gap-2', className)} {...props}>
            <Filter className="size-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 text-xs">
                    {activeCount}
                </Badge>
            )}
            <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} />
        </Button>
    );
});
FilterToggleButton.displayName = 'FilterToggleButton';

export default FilterToggleButton;
