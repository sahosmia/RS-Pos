import StatCards, { type StatCardItem } from '@/components/shared/stat-cards';
import { useMoneyFormat } from '@/hooks/use-money-format';
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
 * under pagination. Colour carries meaning (green = money coming in,
 * red = money owed); the counts stay neutral.
 */
export default function ContactStatCards({ stats, totalLabel, activeLabel, receivableLabel, payableLabel }: ContactStatCardsProps) {
    const money = useMoneyFormat();

    const cards: StatCardItem[] = [
        { label: totalLabel, value: stats.total.toLocaleString(), icon: Users },
        { label: activeLabel, value: stats.active.toLocaleString(), icon: UserCheck },
        { label: receivableLabel, value: money(stats.total_receivable), icon: ArrowDownCircle, accent: 'success' },
        { label: payableLabel, value: money(stats.total_payable), icon: ArrowUpCircle, accent: 'danger' },
    ];

    return <StatCards cards={cards} />;
}
