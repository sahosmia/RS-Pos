<?php

namespace App\Queries\Asset;

use App\Enums\AssetTransactionType;
use App\Models\Asset;
use Illuminate\Database\Eloquent\Builder;

class AssetQuery
{
    /**
     * Shared by the Assets list page and its export endpoint so the two
     * never drift apart. No filters exist on this list today (see
     * `AssetController::index()`'s previous `->get()`) — nothing to accept
     * or apply here beyond the same eager counts/ordering the index always
     * used.
     *
     * @return Builder<Asset>
     */
    public static function filtered(): Builder
    {
        return Asset::query()
            ->withCount([
                'transactions',
                'transactions as movements_count' => fn (Builder $query) => $query->where('type', '!=', AssetTransactionType::OpeningAsset),
            ])
            ->orderBy('name');
    }
}
