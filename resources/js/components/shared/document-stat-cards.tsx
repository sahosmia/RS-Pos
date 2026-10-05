import StatCards from '@/components/shared/stat-cards';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, type LucideIcon } from 'lucide-react';

interface DocumentStatCardsProps {
    /** What is being counted, e.g. "Sales" → the first card reads "Total Sales". */
    noun: string;
    icon: LucideIcon;
    count: number;
    totalAmount: number;
    totalPaid: number;
    totalDue: number;
}

/** The four figures on top of the Sales / Purchases lists: how many, how much, how much is paid, how much is still due. */
export function DocumentStatCards({ noun, icon, count, totalAmount, totalPaid, totalDue }: DocumentStatCardsProps) {
    const money = useMoneyFormat();

    return (
        <StatCards
            cards={[
                {
                    label: `Total ${noun}`,
                    value: count.toLocaleString(),
                    icon,
                    tone: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-500/15',
                },
                {
                    label: 'Total Amount',
                    value: money(totalAmount),
                    icon: DollarSign,
                    tone: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-500/15',
                },
                {
                    label: 'Total Paid',
                    value: money(totalPaid),
                    icon: ArrowDownCircle,
                    tone: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15',
                },
                {
                    label: 'Total Due',
                    value: money(totalDue),
                    icon: ArrowUpCircle,
                    tone: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15',
                },
            ]}
        />
    );
}
