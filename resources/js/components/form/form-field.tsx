import { LabelTooltip } from '@/components/form/label-tooltip';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import React from 'react';

/**
 * Shared vertical contract for every form control: Label → Control → Message.
 *
 * The wrapper is `grid content-start`, NOT a bare `grid`: inside a stretched grid cell
 * (a row where a sibling has an error and grew taller) a plain `grid` hands its extra
 * height to its auto rows, pushing the control away from its label. `content-start`
 * pins label + control to the top so only the bottom message slot ever differs.
 */
export function fieldMessageIds(id: string, error?: string, helperText?: React.ReactNode) {
    return {
        errorId: error ? `${id}-error` : undefined,
        helperId: helperText ? `${id}-helper` : undefined,
    };
}

/** `aria-*` props a control should spread so assistive tech links it to its message. */
export function fieldAriaProps(id: string, error?: string, helperText?: React.ReactNode) {
    const { errorId, helperId } = fieldMessageIds(id, error, helperText);
    const describedBy = [errorId, helperId].filter(Boolean).join(' ');

    return {
        'aria-invalid': error ? (true as const) : undefined,
        'aria-describedby': describedBy || undefined,
    };
}

interface FormFieldProps {
    /** id of the control inside — used for `htmlFor` and the message ids. */
    id: string;
    label?: React.ReactNode;
    tooltip?: React.ReactNode;
    required?: boolean;
    /** Shows a muted "(optional)" next to the label (ignored when `required`). */
    optional?: boolean;
    error?: string;
    helperText?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

/** Secondary hint under a control. Give it the id from `fieldMessageIds()` so `aria-describedby` resolves. */
export function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('text-muted-foreground text-xs leading-4 wrap-break-word', className)} {...props} />;
}

/** Validation message under a control (same component `FormField` renders for its `error` prop). */
export const FormError = InputError;

/**
 * Vertical rhythm: label → 8px → control → 6px → description/error. The label gap is the grid
 * gap plus `pb-0.5`, so message rows sit closer to the control than the label does.
 */
export function FormField({ id, label, tooltip, required, optional, error, helperText, className, children }: FormFieldProps) {
    const { errorId, helperId } = fieldMessageIds(id, error, helperText);

    return (
        <div className={cn('grid min-w-0 content-start gap-1.5', className)}>
            {label && (
                <Label htmlFor={id} required={required} optional={optional} className="pb-0.5">
                    <LabelTooltip label={label} tooltip={tooltip} />
                </Label>
            )}
            {children}
            {helperText && <FormDescription id={helperId}>{helperText}</FormDescription>}
            <FormError id={errorId} message={error} />
        </div>
    );
}
