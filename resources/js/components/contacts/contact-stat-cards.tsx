import { useMoneyFormat } from '@/hooks/use-money-format';
import { cn } from '@/lib/utils';
import { ArrowDownCircle, ArrowUpCircle, UserCheck, Users } from 'lucide-react';

export interface ContactStats {
    total: number;
    active: number;
    total_receivable: number;
    total_payable: number;
}

interface ContactStatCardsProps {
    stats: ContactStats;
    totalLabel: string;
    activeLabel: string;
    receivableLabel: string;
    payableLabel: string;
}

/**
 * A quick-glance summary row above the Contacts table — totals across the
 * whole filtered set (not just the current page), so it stays meaningful
 * under pagination. Deliberately its own component rather than shadcn's
 * plain `Card` so the accent colors carry meaning (green = money coming in,
 * red = money owed) instead of being purely decorative.
 */
export default function ContactStatCards({ stats, totalLabel, activeLabel, receivableLabel, payableLabel }: ContactStatCardsProps) {
    const money = useMoneyFormat();

    const cards = [
        {
            label: totalLabel,
            value: stats.total.toLocaleString(),
            icon: Users,
            tone: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-500/15',
        },
        {
            label: activeLabel,
            value: stats.active.toLocaleString(),
            icon: UserCheck,
            tone: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-500/15',
        },
        {
            label: receivableLabel,
            value: money(stats.total_receivable),
            icon: ArrowDownCircle,
            tone: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15',
        },
        {
            label: payableLabel,
            value: money(stats.total_payable),
            icon: ArrowUpCircle,
            tone: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="group relative overflow-hidden rounded-lg border border-border bg-card/80 p-4 transition-all hover:shadow-2xs"
                >
                    <div className="flex items-center gap-3">
                        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', card.tone)}>
                            <card.icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-muted-foreground truncate text-xs font-medium">{card.label}</p>
                            <p className="truncate text-lg font-semibold tabular-nums">{card.value}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
