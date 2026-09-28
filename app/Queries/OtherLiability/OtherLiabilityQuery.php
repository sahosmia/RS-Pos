<?php

namespace App\Queries\OtherLiability;

use App\Enums\OtherLiabilityTransactionType;
use App\Models\OtherLiability;
use Illuminate\Database\Eloquent\Builder;

class OtherLiabilityQuery
{
    /**
     * Shared by the Other Liabilities list page and its export endpoint so
     * the two never drift apart.
     *
     * @param  array{sort?: ?string, direction?: ?string}  $filters
     * @return Builder<OtherLiability>
     */
    public static function filtered(array $filters = []): Builder
    {
        $sort = $filters['sort'] ?? 'name';
        $direction = $filters['direction'] ?? 'asc';
        $allowedSorts = ['name', 'due_date', 'opening_balance', 'current_balance', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'name';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'asc';
        }

        return OtherLiability::query()
            ->withCount([
                'transactions',
                'transactions as movements_count' => fn (Builder $query) => $query->where('type', '!=', OtherLiabilityTransactionType::OpeningLiability),
            ])
            ->orderBy($sort, $direction);
    }
}
