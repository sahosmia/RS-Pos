<?php

namespace App\Queries\Asset;

use App\Enums\AssetTransactionType;
use App\Models\Asset;
use Illuminate\Database\Eloquent\Builder;

class AssetQuery
{
    /**
     * Shared by the Assets list page and its export endpoint so the two
     * never drift apart.
     *
     * @param  array{sort?: ?string, direction?: ?string}  $filters
     * @return Builder<Asset>
     */
    public static function filtered(array $filters = []): Builder
    {
        $sort = $filters['sort'] ?? 'name';
        $direction = $filters['direction'] ?? 'asc';
        $allowedSorts = ['name', 'asset_code', 'purchase_date', 'value', 'current_value', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'name';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'asc';
        }

        return Asset::query()
            ->withCount([
                'transactions',
                'transactions as movements_count' => fn (Builder $query) => $query->where('type', '!=', AssetTransactionType::OpeningAsset),
            ])
            ->orderBy($sort, $direction);
    }
}
