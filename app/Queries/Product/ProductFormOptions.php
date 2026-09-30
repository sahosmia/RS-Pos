<?php

namespace App\Queries\Product;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Unit;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ProductFormOptions
{
    public const CACHE_KEY = 'product_form_options';

    /**
     * @return array{categories: Collection, brands: Collection, units: Collection}
     */
    public static function forIndex(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addHours(24), fn () => [
            'categories' => Category::query()->orderBy('name')->get(['id', 'name', 'parent_id']),
            'brands' => Brand::query()->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name', 'short_name']),
        ]);
    }

    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
