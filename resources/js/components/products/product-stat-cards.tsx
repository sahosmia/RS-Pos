import StatCards, { type StatCardItem } from '@/components/shared/stat-cards';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import { AlertTriangle, Boxes, Coins, Package } from 'lucide-react';

export interface ProductStats {
    total_products: number;
    total_stock: number;
    total_stock_value: number;
    low_stock_count: number;
}

interface ProductStatCardsProps {
    stats: ProductStats;
}

export default function ProductStatCards({ stats }: ProductStatCardsProps) {
    const { t } = useTranslation();
    const money = useMoneyFormat();

    const cards: StatCardItem[] = [
        {
            label: t('productsPage', 'total_products'),
            value: stats.total_products.toLocaleString(),
            icon: Package,
            tone: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-500/15',
        },
        {
            label: t('productsPage', 'total_stock'),
            value: stats.total_stock.toLocaleString(),
            icon: Boxes,
            tone: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-500/15',
        },
        {
            label: t('productsPage', 'total_stock_value'),
            value: money(stats.total_stock_value),
            icon: Coins,
            tone: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15',
        },
        {
            label: t('productsPage', 'low_stock_products'),
            value: stats.low_stock_count.toLocaleString(),
            icon: AlertTriangle,
            tone: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15',
        },
    ];

    return <StatCards cards={cards} />;
}
