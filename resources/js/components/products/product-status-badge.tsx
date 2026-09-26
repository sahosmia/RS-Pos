import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/use-translation';
import { statusTone } from '@/lib/status-tones';
import { type StockStatus } from '@/types/models';

const stockStatusColor: Record<StockStatus, string> = {
    in_stock: statusTone.success,
    low_stock: statusTone.warning,
    out_of_stock: statusTone.danger,
};

interface ProductStatusBadgeProps {
    product: {
        manage_stock: boolean;
        stock_status: StockStatus;
        is_active: boolean;
    };
}

/** Stock-status + Inactive badges — shown identically in the table's Status column and the mobile card. */
export default function ProductStatusBadge({ product }: ProductStatusBadgeProps) {
    const { t } = useTranslation();

    const stockStatusLabel: Record<StockStatus, string> = {
        in_stock: t('productList', 'in_stock'),
        low_stock: t('productList', 'low_stock'),
        out_of_stock: t('productList', 'out_of_stock'),
    };

    return (
        <span className="inline-flex items-center gap-1">
            {product.manage_stock ? (
                <Badge variant="outline" className={stockStatusColor[product.stock_status]}>
                    {stockStatusLabel[product.stock_status]}
                </Badge>
            ) : (
                <Badge variant="outline">{t('productList', 'service_item')}</Badge>
            )}
            {!product.is_active && <Badge variant="outline">{t('productList', 'inactive')}</Badge>}
        </span>
    );
}
