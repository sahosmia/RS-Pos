import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface PanelCardProps {
    className?: string;
    children: ReactNode;
}

/** The standard bordered surface for charts / widgets. Pass `h-full` when it should fill a grid cell. */
export function PanelCard({ className, children }: PanelCardProps) {
    return <div className={cn('border-border/70 bg-card overflow-hidden rounded-xl border shadow-sm', className)}>{children}</div>;
}
