<?php

namespace App\Http\Controllers\Assets;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Settings;
use App\Queries\Asset\AssetQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class AssetExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'name' => 'Name',
        'opening_value' => 'Opening Value',
        'current_value' => 'Current Value',
        'purchase_date' => 'Purchase Date',
    ];

    /**
     * Exports the same rows the Assets Datatable's "Export" dialog offered —
     * same (currently filter-less) list as the index page, plus a row scope
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

        $query = AssetQuery::filtered();

        $assets = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $assets->map(fn (Asset $asset) => array_map(
            fn (string $id) => $this->cell($asset, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'assets', 'Assets', $headings, $rows);
    }

    /**
     * @param  Builder<Asset>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, Asset>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(Asset $asset, string $column): string|int|float|null
    {
        return match ($column) {
            'name' => $asset->name,
            'opening_value' => $asset->opening_value,
            'current_value' => $asset->current_value,
            'purchase_date' => $asset->purchase_date?->toDateString(),
        };
    }
}
