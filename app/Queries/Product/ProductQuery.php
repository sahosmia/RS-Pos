<?php

namespace App\Queries\Product;

use App\Enums\DateRangePreset;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class ProductQuery
{
    /**
     * @param  array{search?: ?string, category_id?: ?int, brand_id?: ?int, stock_status?: ?string, preset?: ?string, from?: ?string, to?: ?string, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<Product>
     */
    public static function filtered(array $filters): Builder
    {
        $sort = $filters['sort'] ?? 'name';
        $direction = $filters['direction'] ?? 'asc';
        $dateRange = self::resolveDateRange($filters);

        return Product::query()
            ->with(['category:id,name', 'brand:id,name', 'unit:id,name'])
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
            ->when($dateRange, fn (Builder $q) => $q->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]))
            ->orderBy($sort, $direction);
    }

    /**
     * Resolves the optional `preset`/`from`/`to` filters into a concrete
     * start/end range, the same way `DashboardController` resolves its own
     * date range from {@see DateRangePreset::resolve()} — `null` means "no
     * date filter applied" (unlike the dashboard, which always has an active
     * preset, this filter is off by default).
     *
     * @param  array{preset?: ?string, from?: ?string, to?: ?string}  $filters
     * @return array{start: Carbon, end: Carbon}|null
     */
    private static function resolveDateRange(array $filters): ?array
    {
        if (empty($filters['preset'])) {
            return null;
        }

        $preset = DateRangePreset::from($filters['preset']);

        if ($preset === DateRangePreset::Custom) {
            if (empty($filters['from']) || empty($filters['to'])) {
                return null;
            }

            return [
                'start' => Carbon::parse($filters['from'])->startOfDay(),
                'end' => Carbon::parse($filters['to'])->endOfDay(),
            ];
        }

        $range = $preset->resolve();

        return [
            'start' => $range['start']->copy()->startOfDay(),
            'end' => $range['end']->copy()->endOfDay(),
        ];
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
            'preset' => ['nullable', Rule::enum(DateRangePreset::class)],
            'from' => ['nullable', 'date', 'required_if:preset,custom'],
            'to' => ['nullable', 'date', 'after_or_equal:from', 'required_if:preset,custom'],
            'sort' => ['nullable', 'in:name,selling_price,current_stock'],
            'direction' => ['nullable', 'in:asc,desc'],
        ];
    }
}
