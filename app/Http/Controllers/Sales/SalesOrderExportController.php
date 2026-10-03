<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use App\Models\Settings;
use App\Queries\Sale\SalesOrderQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class SalesOrderExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'order_no' => 'Order No',
        'customer' => 'Customer',
        'order_date' => 'Order Date',
        'expected_delivery_date' => 'Expected Delivery',
        'total_amount' => 'Total',
        'advance_paid' => 'Advance',
        'due_amount' => 'Due',
        'status' => 'Status',
    ];

    /**
     * Exports the same rows the Sales Order Datatable's "Export" dialog
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
            'customer_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'status' => ['nullable', 'in:pending,partial,completed,cancelled'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = SalesOrderQuery::filtered($validated);

        $orders = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => TableExport::chunked($query),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $orders->map(fn (SalesOrder $order) => array_map(
            fn (string $id) => $this->cell($order, $id),
            $validated['columns'],
        ));

        return TableExport::respond($validated['format'], 'sales-orders', 'Sales Orders', $headings, $rows);
    }

    /**
     * @param  Builder<SalesOrder>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, SalesOrder>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return TableExport::chunked($query);
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(SalesOrder $order, string $column): string|int|float|null
    {
        return match ($column) {
            'order_no' => $order->order_no,
            'customer' => $order->customer->name,
            'order_date' => $order->order_date->toDateString(),
            'expected_delivery_date' => $order->expected_delivery_date?->toDateString(),
            'total_amount' => $order->total_amount,
            'advance_paid' => $order->advance_paid,
            'due_amount' => round($order->total_amount - $order->advance_paid, 2),
            'status' => ucfirst($order->status->value),
        };
    }
}
