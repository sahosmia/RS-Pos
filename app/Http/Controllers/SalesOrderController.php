<?php

namespace App\Http\Controllers;

use App\Actions\SalesOrder\CreateSalesOrderAction;
use App\Http\Requests\SalesOrder\StoreSalesOrderRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\SalesOrder;
use Illuminate\Database\Eloquent\Builder;
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
        ]);

        $orders = SalesOrder::query()
            ->with('customer:id,name')
            ->when($validated['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('order_date', '>=', $from))
            ->when($validated['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('order_date', '<=', $to))
            ->when($validated['customer_id'] ?? null, fn (Builder $query, int $id) => $query->where('customer_id', $id))
            ->when($validated['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->paginate(20)
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

        return Inertia::render('sales-orders/index', [
            'orders' => $orders,
            'customers' => Contact::query()->customers()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'customer_id' => $validated['customer_id'] ?? null,
                'status' => $validated['status'] ?? null,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('sales-orders/create', [
            'customers' => Contact::query()->customers()->orderBy('name')->get(['id', 'name', 'balance']),
            'products' => Product::query()->where('is_for_sale', true)->orderBy('name')
                ->get(['id', 'name', 'sku', 'barcode', 'selling_price', 'current_stock', 'track_serial_number', 'has_installation_service']),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance']),
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

        return Inertia::render('sales-orders/show', [
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
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance']),
        ]);
    }
}
