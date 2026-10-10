import { cn } from '@/lib/utils';

/**
 * Placeholder block. Sized by the caller to match the real content it stands in for, so nothing jumps
 * when data arrives. A slow, low-contrast pulse (no shimmer sweep); static under reduced motion.
 * Decorative: group it inside a `role="status"` wrapper (see `shared/skeletons.tsx`) so assistive tech hears "Loading" once.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('bg-brand-secondary animate-pulse rounded-md motion-reduce:animate-none', className)} {...props} />;
}

export { Skeleton };
