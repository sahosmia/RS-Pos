<?php

namespace App\Http\Controllers\OtherLiabilities;

use App\Http\Controllers\Controller;
use App\Models\OtherLiability;
use App\Models\Settings;
use App\Queries\OtherLiability\OtherLiabilityQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class OtherLiabilityExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'name' => 'Name',
        'opening_amount' => 'Opening Amount',
        'current_balance' => 'Current Balance',
    ];

    /**
     * Exports the same rows the Other Liabilities Datatable's "Export" dialog
     * offered — same (currently filter-less) list as the index page, plus a
     * row scope (page/all/selected) and a column subset chosen in that dialog.
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

        $query = OtherLiabilityQuery::filtered();

        $liabilities = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $liabilities->map(fn (OtherLiability $liability) => array_map(
            fn (string $id) => $this->cell($liability, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'other-liabilities', 'Other Liabilities', $headings, $rows);
    }

    /**
     * @param  Builder<OtherLiability>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, OtherLiability>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(OtherLiability $liability, string $column): string|int|float|null
    {
        return match ($column) {
            'name' => $liability->name,
            'opening_amount' => $liability->opening_amount,
            'current_balance' => $liability->current_balance,
        };
    }
}
