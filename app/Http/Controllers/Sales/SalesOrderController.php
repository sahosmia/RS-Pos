<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\SalesOrder\CreateSalesOrderAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\SalesOrder\StoreSalesOrderRequest;
use App\Models\Contact;
use App\Models\SalesOrder;
use App\Models\Settings;
use App\Queries\Sale\SalesFormOptions;
use App\Queries\Sale\SalesOrderQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalesOrderController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'customer_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'status' => ['nullable', 'in:pending,partial,completed,cancelled'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $orders = SalesOrderQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $orders->getCollection()->transform(fn (SalesOrder $order) => [
            'id' => $order->id,
            'order_no' => $order->order_no,
            'customer' => $order->customer->only(['id', 'name']),
            'order_date' => $order->order_date->toDateString(),
            'expected_delivery_date' => $order->expected_delivery_date?->toDateString(),
            'total_amount' => $order->total_amount,
            'advance_paid' => $order->advance_paid,
            'due_amount' => round($order->total_amount - $order->advance_paid, 2),
            'status' => $order->status,
            'can_convert' => $order->canConvert(),
        ]);

        return Inertia::render('sales/sales-orders/index', [
            'orders' => $orders,
            // Only the currently-filtered customer's own label, not every customer —
            // the filter itself searches async (see `ContactSearchController`).
            'initialCustomer' => isset($validated['customer_id'])
                ? Contact::query()->find($validated['customer_id'], ['id', 'name', 'phone', 'business_name', 'balance'])
                : null,
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'customer_id' => $validated['customer_id'] ?? null,
                'status' => $validated['status'] ?? null,
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('sales/sales-orders/create', [
            'initialCustomer' => null,
            'products' => SalesFormOptions::productsForSale(),
            'accounts' => SalesFormOptions::activeAccounts(),
        ]);
    }

    public function store(StoreSalesOrderRequest $request, CreateSalesOrderAction $createOrder): RedirectResponse
    {
        $order = $createOrder->execute($request->validated());

        return to_route('sales-orders.show', $order);
    }

    public function show(SalesOrder $salesOrder): Response
    {
        $salesOrder->load(['customer:id,name,phone,balance', 'items.product:id,name,sku', 'sale:id,invoice_no,sales_order_id']);

        return Inertia::render('sales/sales-orders/show', [
            'order' => [
                'id' => $salesOrder->id,
                'order_no' => $salesOrder->order_no,
                'customer' => $salesOrder->customer->only(['id', 'name', 'phone', 'balance']),
                'order_date' => $salesOrder->order_date->toDateString(),
                'expected_delivery_date' => $salesOrder->expected_delivery_date?->toDateString(),
                'total_amount' => $salesOrder->total_amount,
                'advance_paid' => $salesOrder->advance_paid,
                'due_amount' => round($salesOrder->total_amount - $salesOrder->advance_paid, 2),
                'status' => $salesOrder->status,
                'can_convert' => $salesOrder->canConvert(),
                'sale' => $salesOrder->sale?->only(['id', 'invoice_no']),
                'items' => $salesOrder->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product' => $item->product->only(['id', 'name', 'sku']),
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'subtotal' => $item->subtotal,
                ]),
            ],
            'accounts' => SalesFormOptions::activeAccounts(),
        ]);
    }
}
