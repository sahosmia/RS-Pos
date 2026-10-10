import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const labelVariants = cva('text-foreground text-sm leading-5 font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-60');

const Label = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants> & { required?: boolean; optional?: boolean }
>(({ className, required, optional, children, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props}>
        {children}
        {/* doc/corrections2.md #10 — one place for every form's required-field marker, instead of each form hand-rolling its own. */}
        {required && (
            <span className="text-brand-danger-text ml-0.5 font-normal" aria-hidden="true">
                *
            </span>
        )}
        {optional && !required && <span className="text-muted-foreground ml-1.5 text-xs font-normal">(optional)</span>}
    </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
