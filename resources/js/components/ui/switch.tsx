import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>>(
    ({ className, ...props }, ref) => (
        <SwitchPrimitives.Root
            className={cn(
                'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 outline-hidden',
                'motion-colors',
                'focus-visible:ring-[3px] focus-visible:ring-brand-focus-ring/30 focus-visible:ring-offset-1 ring-offset-background',
                'data-[state=checked]:bg-brand-primary data-[state=unchecked]:bg-brand-control-border-hover',
                'aria-invalid:ring-2 aria-invalid:ring-brand-danger/40',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
            ref={ref}
        >
            <SwitchPrimitives.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.3)] ring-0 motion-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
        </SwitchPrimitives.Root>
    ),
);
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
