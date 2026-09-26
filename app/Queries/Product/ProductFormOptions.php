<?php

namespace App\Queries\Product;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Unit;
use Illuminate\Support\Collection;

class ProductFormOptions
{
    /**
     * @return array{categories: Collection, brands: Collection, units: Collection}
     */
    public static function forIndex(): array
    {
        return [
            'categories' => Category::query()->orderBy('name')->get(['id', 'name', 'parent_id']),
            'brands' => Brand::query()->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name']),
        ];
    }
}
