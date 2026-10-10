import { type BadgeVariant } from '@/components/ui/badge';
import {
    Ban,
    CircleAlert,
    CircleCheck,
    CircleDashed,
    CircleX,
    Clock,
    FileText,
    Loader,
    PackageCheck,
    Truck,
    Undo2,
    type LucideIcon,
} from 'lucide-react';

/**
 * The one place that decides how a business status looks: its badge variant and a shape-distinct icon
 * (so meaning never depends on colour alone). The generic `Badge` knows nothing about this.
 *
 * Keys are the backend's snake_case values; `normalizeStatus()` also accepts "In Stock", "in-stock", "canceled".
 * Add a status by adding a row here — no component needs to change.
 */
export interface StatusStyle {
    variant: BadgeVariant;
    icon: LucideIcon;
}

const success = { variant: 'success', icon: CircleCheck } as const;
const warning = { variant: 'warning', icon: Clock } as const;
const danger = { variant: 'destructive', icon: CircleX } as const;
const info = { variant: 'info', icon: Loader } as const;
const neutral = { variant: 'neutral', icon: CircleDashed } as const;

export const STATUS_STYLES: Record<string, StatusStyle> = {
    // Lifecycle
    active: success,
    inactive: { variant: 'neutral', icon: Ban },
    draft: { variant: 'neutral', icon: FileText },
    published: success,
    open: success,
    closed: neutral,
    posted: success,
    reversed: { variant: 'neutral', icon: Undo2 },

    // Approval / workflow
    pending: warning,
    approved: success,
    rejected: danger,
    quotation: info,
    confirmed: success,
    ordered: info,
    scheduled: info,
    in_progress: info,
    processing: info,
    completed: success,
    resolved: success,
    received: success,
    cancelled: { variant: 'destructive', icon: Ban },

    // Payment
    paid: success,
    unpaid: danger,
    due: danger,
    partial: { variant: 'warning', icon: CircleAlert },
    overdue: { variant: 'destructive', icon: CircleAlert },

    // Stock
    in_stock: success,
    low_stock: { variant: 'warning', icon: CircleAlert },
    out_of_stock: danger,

    // Fulfilment
    shipped: { variant: 'info', icon: Truck },
    delivered: { variant: 'success', icon: PackageCheck },
    returned: { variant: 'warning', icon: Undo2 },
    refunded: { variant: 'neutral', icon: Undo2 },
};

const FALLBACK_STYLE: StatusStyle = neutral;

export function normalizeStatus(status: string): string {
    const key = status.trim().toLowerCase().replace(/[\s-]+/g, '_');

    return key === 'canceled' ? 'cancelled' : key;
}

export function getStatusStyle(status: string): StatusStyle {
    return STATUS_STYLES[normalizeStatus(status)] ?? FALLBACK_STYLE;
}

/** "in_stock" → "In Stock". Used when a caller doesn't pass a translated label. */
export function humanizeStatus(status: string): string {
    return status.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
