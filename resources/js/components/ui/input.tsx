import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, onWheel, value, ...props }, ref) => {
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

    return (
        <input
            type={type}
            value={displayValue}
            onWheel={handleWheel}
            className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});

Input.displayName = 'Input';

export { Input };
