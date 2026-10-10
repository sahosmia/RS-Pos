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
        },
        {
            label: t('productsPage', 'total_stock'),
            value: stats.total_stock.toLocaleString(),
            icon: Boxes,
        },
        {
            label: t('productsPage', 'total_stock_value'),
            value: money(stats.total_stock_value),
            icon: Coins,
            accent: 'info',
        },
        {
            label: t('productsPage', 'low_stock_products'),
            value: stats.low_stock_count.toLocaleString(),
            icon: AlertTriangle,
            accent: stats.low_stock_count > 0 ? 'warning' : 'neutral',
        },
    ];

    return <StatCards cards={cards} />;
}
