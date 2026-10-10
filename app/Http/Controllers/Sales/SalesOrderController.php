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
            'status' => ['nullable', 'in:open,pending,partial,completed,cancelled,all'],
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        // Orders that were confirmed (or cancelled) leave the list; it opens on the ones still waiting. Pick a status to look back.
        $validated['status'] ??= 'open';

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
            'added_by' => $order->creator?->name,
            'can_convert' => $order->canConvert(),
        ]);

        return Inertia::render('sales/sales-orders/index', [
            'orders' => $orders,
            // Only the currently-filtered customer's own label, not every customer —
            // the filter itself searches async (see `ContactSearchController`).
            'initialCustomer' => isset($validated['customer_id'])
                ? Contact::query()->find($validated['customer_id'])?->only(['id', 'name', 'display_name', 'phone', 'business_name', 'balance'])
                : null,
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'customer_id' => $validated['customer_id'] ?? null,
                'status' => $validated['status'],
                'sort' => $validated['sort'] ?? 'order_date',
                'direction' => $validated['direction'] ?? 'desc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    /**
     * There is no separate order form: a Sales Order is booked from the Add Sale form (its "Sales Order" button).
     */
    public function create(): RedirectResponse
    {
        return to_route('sales.create');
    }

    /**
     * "Confirm Sale" — the order opens in the full sale form; anything can be changed, then Confirm makes the real sale
     * (and the order leaves the open list).
     */
    public function confirm(SalesOrder $salesOrder): Response|RedirectResponse
    {
        if (! $salesOrder->canConvert()) {
            return to_route('sales-orders.show', $salesOrder)->withErrors(['sales_order' => 'This sales order can no longer be confirmed.']);
        }

        $salesOrder->load(['items.product:id,warranty_period_months', 'customer:id,name,phone,business_name,balance']);

        return Inertia::render('sales/sales-orders/confirm', [
            'order' => ['id' => $salesOrder->id, 'order_no' => $salesOrder->order_no, 'advance_paid' => $salesOrder->advance_paid],
            'sale' => [
                'id' => $salesOrder->id,
                'customer_id' => $salesOrder->customer_id,
                'sale_date' => today()->toDateString(),
                'status' => 'draft',
                'discount_type' => $salesOrder->discount_type,
                'discount_value' => $salesOrder->discount_value,
                'valid_until' => null,
                'financing_type' => $salesOrder->financing_type,
                'installment_count' => $salesOrder->installment_count,
                'emi_interest_method' => $salesOrder->emi_interest_method,
                'emi_annual_rate' => $salesOrder->emi_annual_rate,
                'emi_frequency' => $salesOrder->emi_frequency,
                'emi_tenure_value' => $salesOrder->emi_tenure_value,
                'emi_tenure_unit' => $salesOrder->emi_tenure_unit,
                'emi_installation_upfront' => $salesOrder->emi_installation_upfront,
                'items' => $salesOrder->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'original_price' => $item->original_price ?? $item->unit_price,
                    'unit_price' => $item->unit_price,
                    'discount_type' => $item->discount_type,
                    'discount_value' => $item->discount_value,
                    'installation_required' => $item->installation_required,
                    'installation_charge' => $item->installation_charge,
                    'emi_financed' => $item->emi_financed,
                    'warranty_months' => $item->warranty_months ?? $item->product?->warranty_period_months ?? 0,
                    'service_plan_included' => $item->service_plan_included,
                    'note' => $item->note,
                    'serial_numbers' => $item->serial_numbers ?? [],
                ]),
            ],
            'initialCustomer' => $salesOrder->customer->only(['id', 'name', 'display_name', 'phone', 'business_name', 'balance']),
            'products' => SalesFormOptions::productsForSale(),
            'accounts' => SalesFormOptions::activeAccounts(),
        ]);
    }

    public function store(StoreSalesOrderRequest $request, CreateSalesOrderAction $createOrder): RedirectResponse
    {
        $order = $createOrder->execute($request->validated());

        return to_route('sales-orders.index');
    }

    public function show(SalesOrder $salesOrder): Response
    {
        $salesOrder->load(['customer:id,name,phone,balance', 'items.product:id,name,sku,track_serial_number', 'sale:id,invoice_no,sales_order_id']);

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
                'subtotal' => $salesOrder->subtotal,
                'discount_amount' => $salesOrder->discount_amount,
                'installation_amount' => $salesOrder->installation_amount,
                'financing_type' => $salesOrder->financing_type,
                'installment_count' => $salesOrder->installment_count,
                'emi_interest_method' => $salesOrder->emi_interest_method,
                'emi_annual_rate' => $salesOrder->emi_annual_rate,
                'emi_frequency' => $salesOrder->emi_frequency,
                'emi_tenure_value' => $salesOrder->emi_tenure_value,
                'emi_tenure_unit' => $salesOrder->emi_tenure_unit,
                'status' => $salesOrder->status,
                'can_convert' => $salesOrder->canConvert(),
                'sale' => $salesOrder->sale?->only(['id', 'invoice_no']),
                'items' => $salesOrder->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product' => $item->product->only(['id', 'name', 'sku', 'track_serial_number']),
                    'quantity' => $item->quantity,
                    'original_price' => $item->original_price ?? $item->unit_price,
                    'unit_price' => $item->unit_price,
                    'discount_amount' => $item->discount_amount,
                    'subtotal' => $item->subtotal,
                    'installation_required' => $item->installation_required,
                    'installation_charge' => $item->installation_charge,
                    'emi_financed' => $item->emi_financed,
                    'warranty_months' => $item->warranty_months,
                    'service_plan_included' => $item->service_plan_included,
                    'serial_numbers' => $item->serial_numbers ?? [],
                ]),
            ],
            'accounts' => SalesFormOptions::activeAccounts(),
        ]);
    }
}
