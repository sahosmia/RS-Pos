<?php

namespace App\Queries\Product;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

class ProductQuery
{
    /**
     * @param  array{search?: ?string, category_id?: ?int, brand_id?: ?int, stock_status?: ?string, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<Product>
     */
    public static function filtered(array $filters): Builder
    {
        $sort = $filters['sort'] ?? 'name';
        $direction = $filters['direction'] ?? 'asc';

        return Product::query()
            ->with(['category:id,name', 'brand:id,name', 'unit:id,name', 'media'])
            ->withExists('stockMovements as has_stock_movements') // fixes the N+1 in §3
            ->when($filters['search'] ?? null, fn (Builder $q, string $search) => $q->where(
                fn (Builder $q) => $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
            ))
            ->when($filters['category_id'] ?? null, fn (Builder $q, int $id) => $q->where('category_id', $id))
            ->when($filters['brand_id'] ?? null, fn (Builder $q, int $id) => $q->where('brand_id', $id))
            ->when($filters['stock_status'] ?? null, fn (Builder $q, string $status) => match ($status) {
                'out_of_stock' => $q->where('current_stock', '<=', 0),
                'low_stock' => $q->where('current_stock', '>', 0)->whereColumn('current_stock', '<=', 'minimum_stock_level'),
                'in_stock' => $q->whereColumn('current_stock', '>', 'minimum_stock_level'),
            })
            ->orderBy($sort, $direction);
    }

    /**
     * The rules shared by the index page and the export endpoint — kept in
     * one place so the two can never silently drift apart.
     *
     * @return array<string, array<int, mixed>>
     */
    public static function filterRules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'stock_status' => ['nullable', 'in:in_stock,low_stock,out_of_stock'],
            'sort' => ['nullable', 'in:name,selling_price,current_stock,avg_cost'],
            'direction' => ['nullable', 'in:asc,desc'],
        ];
    }
}
