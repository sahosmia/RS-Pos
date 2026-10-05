import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { type StockStatus } from '@/types/models';

/** Text color only (no background), so it survives the browser's print dialog, which drops backgrounds by default. */
const stockQuantityColor: Record<StockStatus, string> = {
    in_stock: '',
    low_stock: 'font-semibold text-amber-600 dark:text-amber-400 print:text-amber-600',
    out_of_stock: 'font-semibold text-red-600 dark:text-red-400 print:text-red-600',
};

interface StockQuantityProps {
    product: {
        manage_stock: boolean;
        stock_status: StockStatus;
        current_stock: number;
        unit: { name: string };
    };
    className?: string;
}

/**
 * "12 pcs" in the table's Stock column and the mobile card — yellow when low, red when out of stock,
 * so the quantity itself carries the stock status instead of a separate badge.
 */
export default function StockQuantity({ product, className }: StockQuantityProps) {
    const { t } = useTranslation();

    if (!product.manage_stock) {
        return <span>—</span>;
    }

    return (
        <span className={cn(stockQuantityColor[product.stock_status], className)} title={t('productList', product.stock_status)}>
            {product.current_stock} {product.unit.name}
        </span>
    );
}
