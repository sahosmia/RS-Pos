<?php

namespace App\Http\Controllers\Products;

use App\Http\Controllers\Controller;
use App\Models\Settings;
use App\Models\WarrantyClaim;
use App\Queries\WarrantyClaim\WarrantyClaimQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class WarrantyClaimExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'claim_date' => 'Claim Date',
        'invoice_no' => 'Invoice',
        'customer' => 'Customer',
        'product' => 'Product',
        'warranty_expires_at' => 'Warranty Expires',
        'issue_description' => 'Issue',
        'status' => 'Status',
        'resolution_note' => 'Resolution Note',
    ];

    /**
     * Exports the same rows the Warranty Claims Datatable's "Export" dialog
     * offered — same filters as the index page, plus a row scope (page/all/
     * selected) and a column subset chosen in that dialog.
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
            'status' => ['nullable', 'in:pending,in_progress,resolved,rejected'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = WarrantyClaimQuery::filtered($validated);

        $claims = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => TableExport::chunked($query),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $claims->map(fn (WarrantyClaim $claim) => array_map(
            fn (string $id) => $this->cell($claim, $id),
            $validated['columns'],
        ));

        return TableExport::respond($validated['format'], 'warranty-claims', 'Warranty Claims', $headings, $rows);
    }

    /**
     * @param  Builder<WarrantyClaim>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, WarrantyClaim>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return TableExport::chunked($query);
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(WarrantyClaim $claim, string $column): string|int|float|null
    {
        return match ($column) {
            'claim_date' => $claim->claim_date->toDateString(),
            'invoice_no' => $claim->saleItem->sale->invoice_no,
            'customer' => $claim->saleItem->sale->customer->name,
            'product' => $claim->saleItem->product->name,
            'warranty_expires_at' => $claim->saleItem->warranty_expires_at?->toDateString(),
            'issue_description' => $claim->issue_description,
            'status' => ucfirst(str_replace('_', ' ', $claim->status->value)),
            'resolution_note' => $claim->resolution_note,
        };
    }
}
