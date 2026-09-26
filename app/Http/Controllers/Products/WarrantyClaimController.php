<?php

namespace App\Http\Controllers\Products;

use App\Http\Controllers\Controller;
use App\Http\Requests\Products\WarrantyClaim\StoreWarrantyClaimRequest;
use App\Http\Requests\Products\WarrantyClaim\UpdateWarrantyClaimRequest;
use App\Models\SaleItem;
use App\Models\Settings;
use App\Models\WarrantyClaim;
use App\Queries\WarrantyClaim\WarrantyClaimQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class WarrantyClaimController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,in_progress,resolved,rejected'],
            'q' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $claims = WarrantyClaimQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $claims->getCollection()->transform(fn (WarrantyClaim $claim) => [
            'id' => $claim->id,
            'product' => $claim->saleItem->product->only(['id', 'name', 'sku']),
            'invoice_no' => $claim->saleItem->sale->invoice_no,
            'customer' => $claim->saleItem->sale->customer->only(['id', 'name']),
            'warranty_expires_at' => $claim->saleItem->warranty_expires_at?->toDateString(),
            'claim_date' => $claim->claim_date->toDateString(),
            'issue_description' => $claim->issue_description,
            'status' => $claim->status,
            'resolution_note' => $claim->resolution_note,
        ]);

        $search = $validated['q'] ?? '';

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
                'warranty_expires_at' => $item->warranty_expires_at?->toDateString(),
            ]);

        return Inertia::render('products/warranty-claims/index', [
            'claims' => $claims,
            'searchQuery' => $search,
            'searchResults' => $items,
            'filters' => [
                'status' => $validated['status'] ?? null,
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function store(StoreWarrantyClaimRequest $request): RedirectResponse
    {
        WarrantyClaim::create([...$request->validated(), 'created_by' => Auth::id()]);

        return to_route('warranty-claims.index');
    }

    public function update(UpdateWarrantyClaimRequest $request, WarrantyClaim $warrantyClaim): RedirectResponse
    {
        $warrantyClaim->update($request->validated());

        return to_route('warranty-claims.index');
    }
}
