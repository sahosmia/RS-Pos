<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\Settings;
use App\Queries\Purchase\PurchaseQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class PurchaseExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'invoice_no' => 'Invoice No',
        'supplier' => 'Supplier',
        'purchase_date' => 'Purchase Date',
        'total_amount' => 'Total',
        'due_amount' => 'Due',
        'payment_status' => 'Payment Status',
        'status' => 'Status',
    ];

    /**
     * Exports the same rows the Purchases Datatable's "Export" dialog offered —
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
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'supplier_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'status' => ['nullable', 'in:draft,ordered,received,cancelled'],
            'payment_status' => ['nullable', 'in:due,partial,paid'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = PurchaseQuery::filtered($validated, $request->user());

        $purchases = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => TableExport::chunked($query),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $purchases->map(fn (Purchase $purchase) => array_map(
            fn (string $id) => $this->cell($purchase, $id),
            $validated['columns'],
        ));

        return TableExport::respond($validated['format'], 'purchases', 'Purchases', $headings, $rows);
    }

    /**
     * @param  Builder<Purchase>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, Purchase>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return TableExport::chunked($query);
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(Purchase $purchase, string $column): string|int|float|null
    {
        return match ($column) {
            'invoice_no' => $purchase->invoice_no,
            'supplier' => $purchase->supplier->name,
            'purchase_date' => $purchase->purchase_date->toDateString(),
            'total_amount' => $purchase->total_amount,
            'due_amount' => $purchase->due_amount,
            'payment_status' => ucfirst($purchase->payment_status->value),
            'status' => ucfirst($purchase->status->value),
        };
    }
}
