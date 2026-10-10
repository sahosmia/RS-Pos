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
        <Card className="flex max-h-96 flex-col lg:absolute lg:inset-0 lg:max-h-none">
            <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>{t('dashboard', 'low_stock_products')}</span>
                </CardTitle>
                <Link
                    href={route('products.index', { stock_status: 'low_stock' })}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                >
                    <span>{t('common', 'view')}</span>
                    <ArrowRight className="h-3 w-3" />
                </Link>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
                {products.length === 0 ? (
                    <div className="text-muted-foreground flex h-40 items-center justify-center p-4 text-center text-xs">
                        {t('common', 'no_results_title')}
                    </div>
                ) : (
                    <div className="divide-border/30 divide-y">
                        {products.map((product) => (
                            <div key={product.id} className="hover:bg-muted/30 flex items-center justify-between p-3 text-xs transition-colors">
                                <div className="min-w-0 flex-1 pr-2">
                                    <p className="text-foreground truncate font-medium">{product.name}</p>
                                    <p className="text-muted-foreground text-[11px]">{product.sku}</p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">{product.current_stock}</span>
                                    <span className="text-muted-foreground text-[11px]"> / {product.minimum_stock_level}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
