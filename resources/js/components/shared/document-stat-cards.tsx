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
                },
                {
                    label: 'Total Amount',
                    value: money(totalAmount),
                    icon: DollarSign,
                    accent: 'info',
                },
                {
                    label: 'Total Paid',
                    value: money(totalPaid),
                    icon: ArrowDownCircle,
                    accent: 'success',
                },
                {
                    label: 'Total Due',
                    value: money(totalDue),
                    icon: ArrowUpCircle,
                    accent: 'danger',
                },
            ]}
        />
    );
}
