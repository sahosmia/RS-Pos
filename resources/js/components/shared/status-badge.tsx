import { Badge, type BadgeProps } from '@/components/ui/badge';
import { getStatusStyle, humanizeStatus } from '@/lib/status';
import { type ReactNode } from 'react';

interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'icon' | 'children' | 'asChild'> {
    /** Backend status value, e.g. `partial`, `in_stock`, `Overdue`. Unknown values render as a neutral badge. */
    status: string;
    /** Translated/custom text. Defaults to the humanized status. */
    label?: ReactNode;
    /** Shape-distinct icon before the label (default on) so status isn't conveyed by colour alone. */
    showIcon?: boolean;
}

/** A status pill: colour + icon + text, all derived from `lib/status.ts`. */
export function StatusBadge({ status, label, showIcon = true, size, ...props }: StatusBadgeProps) {
    const { variant, icon: Icon } = getStatusStyle(status);

    return (
        <Badge variant={variant} size={size} icon={showIcon ? <Icon aria-hidden="true" /> : undefined} {...props}>
            {label ?? humanizeStatus(status)}
        </Badge>
    );
}
