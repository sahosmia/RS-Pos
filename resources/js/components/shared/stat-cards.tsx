import { MetricCard, type MetricAccent } from '@/components/shared/metric-card';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

export interface StatCardItem {
    label: string;
    value: string | number;
    icon: LucideIcon;
    /** Only when the colour carries meaning (paid → success, due → danger). Defaults to neutral. */
    accent?: MetricAccent;
    /** @deprecated Ignored — colours now come from `accent` so every tile shares one palette. */
    tone?: string;
    description?: string;
}

interface StatCardsProps {
    cards: StatCardItem[];
    className?: string;
}

/** Data-driven row of `MetricCard`s for list pages. */
export default function StatCards({ cards, className }: StatCardsProps) {
    return (
        <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
            {cards.map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} icon={card.icon} accent={card.accent} caption={card.description} />
            ))}
        </div>
    );
}
