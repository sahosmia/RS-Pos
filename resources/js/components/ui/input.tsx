import { X } from 'lucide-react';
import * as React from 'react';

import { controlSize, controlSurface, controlWrapperSurface } from '@/lib/form-control';
import { cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';

interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'>, VariantProps<typeof controlSize> {
    /** Icon/element shown inside the control, before the text. */
    leadingIcon?: React.ReactNode;
    /** Icon/element shown inside the control, after the text. */
    trailingIcon?: React.ReactNode;
    /** Short static text before the value (e.g. a currency symbol). */
    prefixText?: React.ReactNode;
    /** Short static text after the value (e.g. a unit such as "kg" or "%"). */
    suffixText?: React.ReactNode;
    /** Passing a handler shows a clear (×) button while the field has a value. */
    onClear?: () => void;
    /** Class for the inner `<input>` when adornments are used (`className` then styles the outer control). */
    inputClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    (
        { className, inputClassName, type, size, onWheel, value, placeholder, leadingIcon, trailingIcon, prefixText, suffixText, onClear, ...props },
        ref,
    ) => {
        // A focused number input silently changes value on mouse-wheel scroll — nobody wants that while
        // scrolling the page (doc/corrections2.md #9, applied here so every number input gets it for free).
        // Blurring first lets the scroll just... scroll, same as it would over any other input.
        const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
            if (type === 'number') {
                event.currentTarget.blur();
            }

            onWheel?.(event);
        };

        // A number field defaulting to 0 displays a literal "0" — clicking in and typing "5" then
        // lands after that digit, producing "05" (parsed back to 5, but the flash/cursor jump reads as
        // a bug to anyone typing at normal speed). Showing blank instead of a bare zero lets typing
        // start clean; every caller already reads an emptied field back as 0 (`Number('') === 0`).
        const displayValue = type === 'number' && (value === 0 || value === '0') ? '' : value;

        const hasAdornment = Boolean(leadingIcon || trailingIcon || prefixText || suffixText || onClear);

        if (!hasAdornment) {
            return (
                <input
                    type={type}
                    placeholder={placeholder ?? (type === 'number' ? '0' : undefined)}
                    value={displayValue}
                    onWheel={handleWheel}
                    className={cn('flex w-full min-w-0 file:border-0 file:bg-transparent file:text-sm file:font-medium', controlSurface, controlSize({ size }), className)}
                    ref={ref}
                    {...props}
                />
            );
        }

        const showClear = Boolean(onClear) && displayValue !== undefined && displayValue !== null && String(displayValue) !== '' && !props.disabled;
        const adornment = 'text-muted-foreground flex shrink-0 items-center text-sm [&_svg]:size-4 [&_svg]:pointer-events-none';

        return (
            <div className={cn('flex w-full min-w-0 items-center gap-2', controlWrapperSurface, controlSize({ size }), className)}>
                {leadingIcon && <span className={adornment}>{leadingIcon}</span>}
                {prefixText && <span className={adornment}>{prefixText}</span>}
                <input
                    type={type}
                    placeholder={placeholder ?? (type === 'number' ? '0' : undefined)}
                    value={displayValue}
                    onWheel={handleWheel}
                    className={cn(
                        'placeholder:text-brand-control-placeholder h-full min-w-0 flex-1 bg-transparent outline-hidden disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden',
                        inputClassName,
                    )}
                    ref={ref}
                    {...props}
                />
                {showClear && (
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label="Clear"
                        className={cn(adornment, 'hover:text-foreground focus-visible:ring-brand-focus-ring/40 rounded-sm outline-hidden focus-visible:ring-2')}
                    >
                        <X />
                    </button>
                )}
                {suffixText && <span className={adornment}>{suffixText}</span>}
                {trailingIcon && <span className={adornment}>{trailingIcon}</span>}
            </div>
        );
    },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
