import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface PanelCardProps {
    className?: string;
    children: ReactNode;
}

/** The standard bordered surface for charts / widgets (a brand `Card` that clips its children). Pass `h-full` to fill a grid cell. */
export function PanelCard({ className, children }: PanelCardProps) {
    return <Card className={cn('overflow-hidden', className)}>{children}</Card>;
}
