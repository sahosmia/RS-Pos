<?php

namespace App\Http\Controllers\Products;

use App\Actions\Products\ServiceRequest\CreateServiceRequestAction;
use App\Actions\Products\ServiceRequest\UpdateServiceRequestAction;
use App\Enums\ServiceRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Products\ServiceRequest\StoreServiceRequestRequest;
use App\Http\Requests\Products\ServiceRequest\UpdateServiceRequestRequest;
use App\Models\Account;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceRequest;
use App\Models\Settings;
use App\Models\Staff;
use App\Queries\ServiceRequest\ServiceRequestQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServiceRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,scheduled,completed,cancelled'],
            'type' => ['nullable', 'in:installation,service'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $requests = ServiceRequestQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $requests->getCollection()->transform(fn (ServiceRequest $serviceRequest) => [
            'id' => $serviceRequest->id,
            'product' => $serviceRequest->saleItem->product->only(['id', 'name', 'sku']),
            'invoice_no' => $serviceRequest->saleItem->sale->invoice_no,
            'customer' => $serviceRequest->saleItem->sale->customer->only(['id', 'name']),
            'type' => $serviceRequest->type,
            'is_free' => $serviceRequest->is_free,
            'charge_amount' => $serviceRequest->charge_amount,
            'staff' => $serviceRequest->staff?->only(['id', 'name']),
            'status' => $serviceRequest->status,
            'next_statuses' => array_map(fn (ServiceRequestStatus $status) => $status->value, $serviceRequest->status->nextStatuses()),
            'request_date' => $serviceRequest->request_date->toDateString(),
            'service_date' => $serviceRequest->service_date?->toDateString(),
            'note' => $serviceRequest->note,
        ]);

        return Inertia::render('products/service-requests/index', [
            'requests' => $requests,
            'staff' => Staff::query()->where('status', 'active')->orderBy('name')->get(['id', 'name', 'designation']),
            'filters' => [
                'status' => $validated['status'] ?? null,
                'type' => $validated['type'] ?? null,
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    /**
     * One form for everything: the invoice is found by number, customer name or phone (see `lookup`), then the
     * rest of the form follows the chosen item and type. Servicing happens months or years after the sale, so
     * there is no "current sale" to start from.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('products/service-requests/create', [
            // Technicians are Staff (Staff menu): only people still working, with their role shown so the right one is easy to pick.
            'staff' => Staff::query()->where('status', 'active')->orderBy('name')->get(['id', 'name', 'designation']),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }

    /**
     * Invoices matching a search, each with the items that can be serviced and what the next visit would cost.
     */
    public function lookup(Request $request): JsonResponse
    {
        $search = $request->validate(['q' => ['required', 'string', 'min:1', 'max:100']])['q'];

        $sales = Sale::query()
            ->with(['customer:id,name,phone', 'items.product:id,name,sku,has_installation_service', 'items.servicePeriods'])
            ->where('status', 'confirmed')
            ->where(function (Builder $query) use ($search) {
                $query->where('invoice_no', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn (Builder $query) => $query->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"));
            })
            ->latest('sale_date')
            ->latest('id')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => $sales->map(fn (Sale $sale) => [
                'id' => $sale->id,
                'invoice_no' => $sale->invoice_no,
                'sale_date' => $sale->sale_date->toDateString(),
                'customer' => $sale->customer->only(['id', 'name', 'phone']),
                'items' => $sale->items->map(fn (SaleItem $item) => [
                    'id' => $item->id,
                    'product' => $item->product->only(['id', 'name', 'sku']),
                    'quantity' => $item->quantity,
                    'is_next_free' => $item->isNextServiceFree(),
                    'free_left' => $item->currentServicePeriod()?->freeQuotaRemaining() ?? 0,
                    'has_service_plan' => $item->servicePeriods->isNotEmpty(),
                    'has_installation_service' => (bool) $item->product->has_installation_service,
                    'warranty_expires_at' => $item->warranty_expires_at?->toDateString(),
                    'in_warranty' => $item->warranty_expires_at !== null && ! $item->warranty_expires_at->isPast(),
                ])->values(),
            ])->values(),
        ]);
    }

    public function store(StoreServiceRequestRequest $request, CreateServiceRequestAction $createServiceRequest): RedirectResponse
    {
        $createServiceRequest->execute($request->validated());

        return to_route('service-requests.index');
    }

    /**
     * Move a request along (scheduled, completed, cancelled) and record the technician and date.
     */
    public function update(UpdateServiceRequestRequest $request, ServiceRequest $serviceRequest, UpdateServiceRequestAction $update): RedirectResponse
    {
        $update->execute($serviceRequest, $request->validated());

        return back();
    }
}
