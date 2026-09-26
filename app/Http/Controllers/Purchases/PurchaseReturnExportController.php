<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use App\Models\PurchaseReturn;
use App\Models\Settings;
use App\Queries\Purchase\PurchaseReturnQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class PurchaseReturnExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'invoice_no' => 'Purchase Invoice No',
        'supplier' => 'Supplier',
        'return_date' => 'Return Date',
        'total_amount' => 'Amount',
        'reason' => 'Reason',
    ];

    /**
     * Exports the same rows the Purchase Returns Datatable's "Export" dialog
     * offered — same filters as the index page, plus a row scope
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
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = PurchaseReturnQuery::filtered($validated);

        $returns = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $returns->map(fn (PurchaseReturn $return) => array_map(
            fn (string $id) => $this->cell($return, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'purchase-returns', 'Purchase Returns', $headings, $rows);
    }

    /**
     * @param  Builder<PurchaseReturn>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, PurchaseReturn>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(PurchaseReturn $return, string $column): string|int|float|null
    {
        return match ($column) {
            'invoice_no' => $return->purchase->invoice_no,
            'supplier' => $return->supplier->name,
            'return_date' => $return->return_date->toDateString(),
            'total_amount' => $return->total_amount,
            'reason' => $return->reason,
        };
    }
}
