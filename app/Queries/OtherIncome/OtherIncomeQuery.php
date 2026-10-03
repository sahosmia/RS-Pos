<?php

namespace App\Queries\OtherIncome;

use App\Models\OtherIncome;
use Illuminate\Database\Eloquent\Builder;

class OtherIncomeQuery
{
    /**
     * Shared by the Other Income list page and its export endpoint so an export always returns
     * exactly the rows the page shows for the same filters.
     *
     * @param  array{category_id?: ?int, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<OtherIncome>
     */
    public static function filtered(array $filters): Builder
    {
        $sort = $filters['sort'] ?? 'income_date';
        $direction = $filters['direction'] ?? 'desc';

        if (! in_array($sort, ['income_date', 'amount', 'created_at'], true)) {
            $sort = 'income_date';
        }

        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        return OtherIncome::query()
            ->with(['category:id,name', 'account:id,name', 'creator:id,name'])
            ->when($filters['category_id'] ?? null, fn (Builder $q, int $id) => $q->where('other_income_category_id', $id))
            ->orderBy($sort, $direction)
            ->orderByDesc('id');
    }
}
