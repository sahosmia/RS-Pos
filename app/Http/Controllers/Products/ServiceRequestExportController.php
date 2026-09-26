<?php

namespace App\Http\Controllers\Products;

use App\Http\Controllers\Controller;
use App\Models\ServiceRequest;
use App\Models\Settings;
use App\Queries\ServiceRequest\ServiceRequestQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ServiceRequestExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'request_date' => 'Date',
        'invoice_no' => 'Invoice',
        'customer' => 'Customer',
        'product' => 'Product',
        'type' => 'Type',
        'charge_amount' => 'Charge',
        'staff' => 'Staff',
        'status' => 'Status',
    ];

    /**
     * Exports the same rows the Service Requests Datatable's "Export" dialog
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
            'status' => ['nullable', 'in:pending,scheduled,completed,cancelled'],
            'type' => ['nullable', 'in:installation,service'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = ServiceRequestQuery::filtered($validated);

        $requests = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $requests->map(fn (ServiceRequest $serviceRequest) => array_map(
            fn (string $id) => $this->cell($serviceRequest, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'service-requests', 'Service Requests', $headings, $rows);
    }

    /**
     * @param  Builder<ServiceRequest>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, ServiceRequest>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(ServiceRequest $serviceRequest, string $column): string|int|float|null
    {
        return match ($column) {
            'request_date' => $serviceRequest->request_date->toDateString(),
            'invoice_no' => $serviceRequest->saleItem->sale->invoice_no,
            'customer' => $serviceRequest->saleItem->sale->customer->name,
            'product' => $serviceRequest->saleItem->product->name,
            'type' => ucfirst($serviceRequest->type->value),
            'charge_amount' => $serviceRequest->is_free ? 0.0 : $serviceRequest->charge_amount,
            'staff' => $serviceRequest->staff?->name,
            'status' => ucfirst($serviceRequest->status->value),
        };
    }
}
