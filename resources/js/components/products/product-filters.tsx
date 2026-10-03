import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { type Brand, type Category, type StockStatus } from '@/types/models';

interface ProductFiltersProps {
    categoryId: number | null;
    brandId: number | null;
    stockStatus: StockStatus | null;
    categories: Category[];
    brands: Brand[];
    onChange: (next: {
        category_id?: number | null;
        brand_id?: number | null;
        stock_status?: StockStatus | null;
    }) => void;
}

/** Dumb filter row — only renders the selects and reports what changed; the page decides what to do about it. */
export default function ProductFilters({ categoryId, brandId, stockStatus, categories, brands, onChange }: ProductFiltersProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap items-end gap-3 pt-3">
            <div className="grid min-w-0 content-start gap-2">
                <Select
                    value={categoryId ? String(categoryId) : 'all'}
                    onValueChange={(value) => onChange({ category_id: value === 'all' ? null : Number(value) })}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder={t('nav', 'category')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('productList', 'all_categories')}</SelectItem>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                                {category.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid min-w-0 content-start gap-2">
                <Select
                    value={brandId ? String(brandId) : 'all'}
                    onValueChange={(value) => onChange({ brand_id: value === 'all' ? null : Number(value) })}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder={t('nav', 'brand')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('productList', 'all_brands')}</SelectItem>
                        {brands.map((brand) => (
                            <SelectItem key={brand.id} value={String(brand.id)}>
                                {brand.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid min-w-0 content-start gap-2">
                <Select
                    value={stockStatus ?? 'all'}
                    onValueChange={(value) => onChange({ stock_status: value === 'all' ? null : (value as StockStatus) })}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder={t('productList', 'stock_status')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('productList', 'all_stock_levels')}</SelectItem>
                        <SelectItem value="in_stock">{t('productList', 'in_stock')}</SelectItem>
                        <SelectItem value="low_stock">{t('productList', 'low_stock')}</SelectItem>
                        <SelectItem value="out_of_stock">{t('productList', 'out_of_stock')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
