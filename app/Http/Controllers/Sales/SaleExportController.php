<?php

namespace App\Http\Controllers\Sales;

use App\Enums\DateRangePreset;
use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Settings;
use App\Queries\Sale\SaleQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class SaleExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'invoice_no' => 'Invoice No',
        'customer' => 'Customer',
        'sale_date' => 'Sale Date',
        'total_amount' => 'Total',
        'due_amount' => 'Due',
        'payment_status' => 'Payment Status',
        'status' => 'Status',
        'source' => 'Source',
    ];

    /**
     * Exports the same rows the Sales Datatable's "Export" dialog offered —
     * same filters as the index page, plus a row scope (page/all/selected)
     * and a column subset chosen in that dialog.
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
            'search' => ['nullable', 'string', 'max:255'],
            'preset' => ['nullable', Rule::in(['all', ...array_column(DateRangePreset::cases(), 'value')])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'customer_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'status' => ['nullable', 'in:draft,quotation,confirmed,cancelled'],
            'payment_status' => ['nullable', 'in:due,partial,paid'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $range = DateRangePreset::forList($validated['preset'] ?? null, $validated['from'] ?? null, $validated['to'] ?? null);

        $query = SaleQuery::filtered([...$validated, 'from' => $range['start'], 'to' => $range['end']], $request->user());

        $sales = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => TableExport::chunked($query),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $sales->map(fn (Sale $sale) => array_map(
            fn (string $id) => $this->cell($sale, $id),
            $validated['columns'],
        ));

        return TableExport::respond($validated['format'], 'sales', 'Sales', $headings, $rows);
    }

    /**
     * @param  Builder<Sale>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, Sale>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return TableExport::chunked($query);
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(Sale $sale, string $column): string|int|float|null
    {
        return match ($column) {
            'invoice_no' => $sale->invoice_no,
            'customer' => $sale->customer->name,
            'sale_date' => $sale->sale_date->toDateString(),
            'total_amount' => $sale->total_amount,
            'due_amount' => $sale->due_amount,
            'payment_status' => ucfirst($sale->payment_status->value),
            'status' => ucfirst($sale->status->value),
            'source' => ucfirst($sale->source->value),
        };
    }
}
