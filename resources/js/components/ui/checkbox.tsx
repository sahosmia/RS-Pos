import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Supports `checked="indeterminate"` (renders a dash). Mark invalid with `aria-invalid`. */
const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(
    ({ className, ...props }, ref) => (
        <CheckboxPrimitive.Root
            ref={ref}
            className={cn(
                'group peer size-4.5 shrink-0 rounded-[calc(var(--brand-control-radius)-3px)] border border-brand-control-border bg-brand-control-bg text-brand-primary-foreground outline-hidden',
                'motion-field',
                'hover:border-brand-control-border-hover focus-visible:border-brand-focus-ring focus-visible:ring-[3px] focus-visible:ring-brand-focus-ring/25',
                'data-[state=checked]:border-brand-primary data-[state=checked]:bg-brand-primary data-[state=indeterminate]:border-brand-primary data-[state=indeterminate]:bg-brand-primary',
                'aria-invalid:border-brand-danger aria-invalid:focus-visible:ring-brand-danger/25',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
                <Check className="size-3.5 stroke-[3] group-data-[state=indeterminate]:hidden" />
                <Minus className="hidden size-3.5 stroke-[3] group-data-[state=indeterminate]:block" />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    ),
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
