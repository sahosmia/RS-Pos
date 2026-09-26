<?php

namespace App\Queries\CompanyLoan;

use App\Models\CompanyLoan;
use Illuminate\Database\Eloquent\Builder;

class CompanyLoanQuery
{
    /**
     * Shared by the Company Loans list page and its export endpoint so the
     * two never drift apart. No filters exist on this list today — only the
     * ordering `CompanyLoanController::index()` already used.
     *
     * @return Builder<CompanyLoan>
     */
    public static function filtered(): Builder
    {
        return CompanyLoan::query()
            ->withCount('transactions')
            ->orderBy('lender_name');
    }
}
