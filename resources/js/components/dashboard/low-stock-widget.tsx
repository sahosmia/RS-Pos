import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import { type DashboardLowStockProduct } from '@/types/models';
import { Link } from '@inertiajs/react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface LowStockWidgetProps {
    products: DashboardLowStockProduct[];
}

export function LowStockWidget({ products }: LowStockWidgetProps) {
    const { t } = useTranslation();

    return (
        <Card className="flex h-full flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>{t('dashboard', 'low_stock_products')}</span>
                </CardTitle>
                <Link
                    href={route('products.index', { stock_status: 'low_stock' })}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <span>{t('common', 'view')}</span>
                    <ArrowRight className="h-3 w-3" />
                </Link>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                {products.length === 0 ? (
                    <div className="flex h-40 items-center justify-center p-4 text-center text-xs text-muted-foreground">
                        {t('common', 'no_results_title')}
                    </div>
                ) : (
                    <div className="divide-y divide-border/30">
                        {products.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-3 text-xs hover:bg-muted/30 transition-colors">
                                <div className="min-w-0 flex-1 pr-2">
                                    <p className="font-medium truncate text-foreground">{product.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{product.sku}</p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                        {product.current_stock}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground"> / {product.minimum_stock_level}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
