<?php

namespace App\Http\Controllers\CompanyLoans;

use App\Http\Controllers\Controller;
use App\Models\CompanyLoan;
use App\Models\Settings;
use App\Queries\CompanyLoan\CompanyLoanQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class CompanyLoanExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'lender_name' => 'Lender',
        'loan_amount' => 'Loan Amount',
        'interest_rate' => 'Interest Rate',
        'outstanding_balance' => 'Outstanding',
        'start_date' => 'Start Date',
    ];

    /**
     * Exports the same rows the Company Loans Datatable's "Export" dialog
     * offered — this list has no filters today, just a row scope
     * (page/all/selected) and a column subset chosen in that dialog.
     */
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'format' => ['required', 'in:csv,xlsx,pdf'],
            'scope' => ['required', 'in:page,all,selected'],
            'columns' => ['required', 'array', 'min:1'],
            'columns.*' => ['string', Rule::in(array_keys(self::COLUMN_LABELS))],
            'ids' => ['required_if:scope,selected', 'array'],
            'ids.*' => ['integer'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = CompanyLoanQuery::filtered();

        $loans = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $loans->map(fn (CompanyLoan $loan) => array_map(
            fn (string $id) => $this->cell($loan, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'company-loans', 'Company Loans', $headings, $rows);
    }

    /**
     * @param  Builder<CompanyLoan>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, CompanyLoan>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(CompanyLoan $loan, string $column): string|int|float|null
    {
        return match ($column) {
            'lender_name' => $loan->lender_name,
            'loan_amount' => $loan->loan_amount,
            'interest_rate' => $loan->interest_rate,
            'outstanding_balance' => $loan->outstanding_balance,
            'start_date' => $loan->start_date->toDateString(),
        };
    }
}
