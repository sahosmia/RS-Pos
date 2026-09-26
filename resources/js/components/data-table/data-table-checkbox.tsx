import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import * as React from 'react';

interface DataTableCheckboxProps extends Omit<React.ComponentPropsWithoutRef<typeof Checkbox>, 'checked' | 'onCheckedChange'> {
    checked: boolean | 'indeterminate';
    onCheckedChange: (checked: boolean) => void;
}

/**
 * The one row-selection checkbox for the whole system — every Datatable's
 * header (select-all/indeterminate) and body (per-row) checkbox renders
 * this instead of a bare `Checkbox`, so a future size/color/a11y tweak only
 * has to happen here, not in every list page.
 */
export default function DataTableCheckbox({ checked, onCheckedChange, className, onClick, ...props }: DataTableCheckboxProps) {
    return (
        <Checkbox
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            onClick={(e) => {
                // Row checkboxes commonly sit inside a clickable row/card — never let the click bubble into that.
                e.stopPropagation();
                onClick?.(e);
            }}
            className={cn('size-4', className)}
            {...props}
        />
    );
}
