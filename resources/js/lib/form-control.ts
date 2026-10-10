import { cva } from 'class-variance-authority';

/**
 * Shared surface for every text-like form control (Input, Textarea, Select trigger, SearchableSelect).
 * State is driven by native attributes (`:disabled`, `aria-invalid`) so callers need no extra props —
 * `fieldAriaProps()` already sets `aria-invalid` from the Laravel/Inertia error string.
 */
export const controlSurface = [
    'rounded-brand-control border border-brand-field-border bg-brand-field-bg text-foreground',
    'outline-hidden',
    'motion-field',
    'placeholder:text-brand-control-placeholder hover:border-brand-field-border-hover',
    'focus-visible:border-brand-focus-ring focus-visible:bg-brand-field-bg-focus focus-visible:ring-[3px] focus-visible:ring-brand-focus-ring/25',
    'aria-invalid:border-brand-danger aria-invalid:focus-visible:ring-brand-danger/25',
    'disabled:cursor-not-allowed disabled:bg-brand-field-disabled disabled:text-muted-foreground disabled:opacity-70 disabled:hover:border-brand-field-border',
].join(' ');

/** Same surface, driven by the state of an inner control (used when an Input has adornments). */
export const controlWrapperSurface = [
    'rounded-brand-control border border-brand-field-border bg-brand-field-bg text-foreground',
    'motion-field',
    'hover:border-brand-field-border-hover',
    'focus-within:border-brand-focus-ring focus-within:bg-brand-field-bg-focus focus-within:ring-[3px] focus-within:ring-brand-focus-ring/25',
    'has-[input[aria-invalid=true]]:border-brand-danger has-[input[aria-invalid=true]]:focus-within:ring-brand-danger/25',
    'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-brand-field-disabled has-[input:disabled]:opacity-70',
].join(' ');

/**
 * Control-looking wrapper for a *button* trigger that opens a popover (DatePicker, Combobox): same surface
 * as Input, driven by the trigger button's state (`aria-invalid`, `:disabled`).
 */
export const controlTriggerSurface = [
    controlWrapperSurface,
    'has-[button[aria-invalid=true]]:border-brand-danger has-[button[aria-invalid=true]]:focus-within:ring-brand-danger/25',
    'has-[button:disabled]:cursor-not-allowed has-[button:disabled]:bg-brand-field-disabled has-[button:disabled]:opacity-70',
    'flex w-full min-w-0 items-center gap-1',
].join(' ');

/** Heights shared by Input and Select so they line up side by side in a form row or toolbar. */
export const controlSize = cva('', {
    variants: {
        size: {
            sm: 'h-8 px-2.5 text-sm',
            default: 'h-9 px-3 text-base md:text-sm',
            lg: 'h-11 px-3.5 text-base',
        },
    },
    defaultVariants: { size: 'default' },
});
