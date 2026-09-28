<?php

namespace App\Queries\CompanyLoan;

use App\Models\CompanyLoan;
use Illuminate\Database\Eloquent\Builder;

class CompanyLoanQuery
{
    /**
     * Shared by the Company Loans list page and its export endpoint so the
     * two never drift apart.
     *
     * @param  array{sort?: ?string, direction?: ?string}  $filters
     * @return Builder<CompanyLoan>
     */
    public static function filtered(array $filters = []): Builder
    {
        $sort = $filters['sort'] ?? 'lender_name';
        $direction = $filters['direction'] ?? 'asc';
        $allowedSorts = ['loan_id', 'lender_name', 'principal_amount', 'current_balance', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'lender_name';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'asc';
        }

        return CompanyLoan::query()
            ->withCount('transactions')
            ->orderBy($sort, $direction);
    }
}
