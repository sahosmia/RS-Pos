import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const spinnerVariants = cva('animate-spin motion-reduce:animate-none', {
    variants: {
        size: { xs: 'size-3', sm: 'size-4', md: 'size-5', lg: 'size-8' },
        tone: { default: 'text-muted-foreground', primary: 'text-brand-primary', inherit: '' },
    },
    defaultVariants: { size: 'sm', tone: 'default' },
});

interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
    /** Announced to screen readers (visually hidden). */
    label?: string;
    className?: string;
}

/** The one spinner. `role="status"` so the label is announced politely when it appears. */
function Spinner({ size, tone, label = 'Loading', className }: SpinnerProps) {
    return (
        <span role="status" className="inline-flex">
            <Loader2 aria-hidden="true" className={cn(spinnerVariants({ size, tone }), className)} />
            <span className="sr-only">{label}</span>
        </span>
    );
}

export { Spinner, spinnerVariants };
