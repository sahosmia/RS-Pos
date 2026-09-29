import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

export interface StatCardItem {
    label: string;
    value: string | number;
    icon: LucideIcon;
    tone?: string;
    description?: string;
}

interface StatCardsProps {
    cards: StatCardItem[];
    className?: string;
}

export default function StatCards({ cards, className }: StatCardsProps) {
    return (
        <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="group relative overflow-hidden rounded-xl border/40 bg-card/80 p-4 transition-all hover:shadow-2xs"
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                                card.tone || 'bg-primary/10 text-primary',
                            )}
                        >
                            <card.icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-muted-foreground">{card.label}</p>
                            <p className="truncate text-lg font-semibold tabular-nums">{card.value}</p>
                            {card.description && (
                                <p className="truncate text-xs text-muted-foreground">{card.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
