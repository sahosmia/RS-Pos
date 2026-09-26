<?php

namespace App\Http\Controllers\Products;

use App\Actions\Products\ServiceRequest\CreateServiceRequestAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Products\ServiceRequest\StoreServiceRequestRequest;
use App\Models\Account;
use App\Models\SaleItem;
use App\Models\ServiceRequest;
use App\Models\Settings;
use App\Models\Staff;
use App\Queries\ServiceRequest\ServiceRequestQuery;
use Illuminate\Database\Eloquent\Builder;
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
            'request_date' => $serviceRequest->request_date->toDateString(),
        ]);

        return Inertia::render('products/service-requests/index', [
            'requests' => $requests,
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
     * Search by invoice number or customer name — servicing happens months/
     * years after the sale, so there's no "current sale" to start from like
     * Sale Return has.
     */
    public function create(Request $request): Response
    {
        $search = $request->string('q')->trim()->toString();

        $items = SaleItem::query()
            ->with(['product:id,name,sku', 'sale:id,invoice_no,customer_id', 'sale.customer:id,name'])
            ->whereHas('sale', function (Builder $query) use ($search) {
                $query->where('status', 'confirmed')
                    ->where(function (Builder $query) use ($search) {
                        $query->where('invoice_no', 'like', "%{$search}%")
                            ->orWhereHas('customer', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"));
                    });
            })
            ->when($search === '', fn (Builder $query) => $query->whereRaw('1 = 0'))
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (SaleItem $item) => [
                'id' => $item->id,
                'product' => $item->product->only(['id', 'name', 'sku']),
                'invoice_no' => $item->sale->invoice_no,
                'customer' => $item->sale->customer->only(['id', 'name']),
                'is_next_free' => $item->isNextServiceFree(),
            ]);

        return Inertia::render('products/service-requests/create', [
            'query' => $search,
            'items' => $items,
            'staff' => Staff::query()->orderBy('name')->get(['id', 'name']),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance']),
        ]);
    }

    public function store(StoreServiceRequestRequest $request, CreateServiceRequestAction $createServiceRequest): RedirectResponse
    {
        $createServiceRequest->execute($request->validated());

        return to_route('service-requests.index');
    }
}
