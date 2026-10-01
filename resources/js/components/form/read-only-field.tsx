import { FormField } from '@/components/form/form-field';
import React from 'react';

interface ReadOnlyFieldProps {
    id: string;
    label?: React.ReactNode;
    tooltip?: React.ReactNode;
    /** The calculated / locked value to display. */
    value: React.ReactNode;
    helperText?: React.ReactNode;
    error?: string;
    className?: string;
}

/**
 * A non-editable value (current stock, balance, total...) that occupies the same
 * slot as an `Input` — same label, same `h-10` control box, same message area — so it
 * lines up with editable siblings in a form grid.
 */
export function ReadOnlyField({ id, label, tooltip, value, helperText, error, className }: ReadOnlyFieldProps) {
    return (
        <FormField id={id} label={label} tooltip={tooltip} helperText={helperText} error={error} className={className}>
            <output
                id={id}
                className="border-input bg-muted/30 flex h-10 w-full min-w-0 items-center rounded-md border px-3 text-base tabular-nums md:text-sm"
            >
                <span className="truncate font-medium">{value}</span>
            </output>
        </FormField>
    );
}
