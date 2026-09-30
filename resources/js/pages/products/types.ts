import { type ProductStats } from '@/components/products/product-stat-cards';
import { type Brand, type Category, type DateRangePresetValue, type Paginated, type ProductListItem, type StockStatus, type Unit } from '@/types/models';

/** Matches `ProductQuery::filterRules()`'s `sort` whitelist exactly — the backend rejects anything else. */
export type ProductSortField = 'name' | 'selling_price' | 'current_stock' | 'avg_cost';

export interface ProductFilters {
    search: string | null;
    category_id: number | null;
    brand_id: number | null;
    stock_status: StockStatus | null;
    /** `created_at` date-range filter (doc/corrections2.md #4's shared `DateRangeFilter`, rolled out here). */
    preset: DateRangePresetValue | null;
    from: string | null;
    to: string | null;
    sort: ProductSortField;
    direction: 'asc' | 'desc';
    per_page: number | 'all';
}

export interface ProductsIndexProps {
    products: Paginated<ProductListItem>;
    stats: ProductStats;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
    filters: ProductFilters;
}
