<?php

namespace App\Queries\Investor;

use App\Enums\InvestorTransactionType;
use App\Models\Investor;
use Illuminate\Database\Eloquent\Builder;

class InvestorQuery
{
    /**
     * Shared by the Investors list page and its export endpoint so the two
     * never drift apart.
     *
     * @param  array{sort?: ?string, direction?: ?string}  $filters
     * @return Builder<Investor>
     */
    public static function filtered(array $filters = []): Builder
    {
        $sort = $filters['sort'] ?? 'name';
        $direction = $filters['direction'] ?? 'asc';
        $allowedSorts = ['name', 'phone', 'current_balance', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'name';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'asc';
        }

        return Investor::query()
            ->withCount([
                'transactions',
                'transactions as movements_count' => fn (Builder $query) => $query->where('type', '!=', InvestorTransactionType::OpeningBalance),
            ])
            ->orderBy($sort, $direction);
    }
}
