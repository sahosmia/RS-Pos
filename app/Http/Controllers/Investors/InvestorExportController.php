<?php

namespace App\Http\Controllers\Investors;

use App\Http\Controllers\Controller;
use App\Models\Investor;
use App\Models\Settings;
use App\Queries\Investor\InvestorQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class InvestorExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'name' => 'Name',
        'total_invested' => 'Total Invested',
    ];

    /**
     * Exports the same rows the Investors Datatable's "Export" dialog
     * offered — the list page has no filters today, plus a row scope
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

        $query = InvestorQuery::filtered();

        $investors = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => TableExport::chunked($query),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $investors->map(fn (Investor $investor) => array_map(
            fn (string $id) => $this->cell($investor, $id),
            $validated['columns'],
        ));

        return TableExport::respond($validated['format'], 'investors', 'Investors', $headings, $rows);
    }

    /**
     * @param  Builder<Investor>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, Investor>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return TableExport::chunked($query);
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(Investor $investor, string $column): string|int|float|null
    {
        return match ($column) {
            'name' => $investor->name,
            'total_invested' => $investor->total_invested,
        };
    }
}
