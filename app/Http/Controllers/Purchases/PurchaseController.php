<?php

namespace App\Http\Controllers\Purchases;

use App\Actions\Purchases\Purchase\CreatePurchaseAction;
use App\Actions\Purchases\Purchase\UpdatePurchaseAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Purchases\Purchase\StorePurchaseRequest;
use App\Http\Requests\Purchases\Purchase\UpdatePurchaseRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Settings;
use App\Queries\Purchase\PurchaseQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    /**
     * Purchase list — filter by date range, supplier, status, payment status.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'supplier_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'status' => ['nullable', 'in:draft,ordered,received,cancelled'],
            'payment_status' => ['nullable', 'in:due,partial,paid'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $purchases = PurchaseQuery::filtered($validated, $request->user())
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $purchases->getCollection()->transform(fn (Purchase $purchase) => [
            'id' => $purchase->id,
            'invoice_no' => $purchase->invoice_no,
            'supplier' => $purchase->supplier->only(['id', 'name']),
            'purchase_date' => $purchase->purchase_date->toDateString(),
            'total_amount' => $purchase->total_amount,
            'paid_amount' => $purchase->paid_amount,
            'due_amount' => $purchase->due_amount,
            'payment_status' => $purchase->payment_status,
            'status' => $purchase->status,
            'can_edit' => $purchase->canEdit(),
        ]);

        return Inertia::render('purchases/index', [
            'purchases' => $purchases,
            // Only the currently-filtered supplier's own label, not every supplier —
            // the filter itself searches async (see `ContactSearchController`).
            'initialSupplier' => isset($validated['supplier_id'])
                ? Contact::query()->find($validated['supplier_id'], ['id', 'name', 'phone', 'business_name', 'balance'])
                : null,
            'filters' => [
                'search' => $validated['search'] ?? null,
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'status' => $validated['status'] ?? null,
                'payment_status' => $validated['payment_status'] ?? null,
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    /**
     * Supplier/Product used to be preloaded whole here (fine at a handful of
     * rows, not at 300+ products) — the form now searches both async
     * (doc/corrections2.md #8, see `ProductSearchController`/
     * `ContactSearchController`), so create needs no initial selection at all.
     */
    public function create(): Response
    {
        return Inertia::render('purchases/create', [
            'initialSupplier' => null,
            'initialProducts' => [],
        ]);
    }

    public function store(StorePurchaseRequest $request, CreatePurchaseAction $createPurchase): RedirectResponse
    {
        $purchase = $createPurchase->execute($request->validated());

        return to_route('purchases.show', $purchase);
    }

    public function show(Purchase $purchase): Response
    {
        $purchase->load(['supplier:id,name,phone,balance', 'creator:id,name', 'items.product:id,name,sku,track_serial_number', 'items' => fn ($query) => $query->orderBy('id')]);

        return Inertia::render('purchases/show', [
            'purchase' => $this->present($purchase),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance']),
        ]);
    }

    public function edit(Purchase $purchase): Response
    {
        abort_unless($purchase->canEdit(), 403);

        $purchase->load(['items', 'supplier:id,name,phone,business_name,balance']);

        // The async Product picker (doc/corrections2.md #8) only knows about whatever's been searched —
        // an edit form needs its already-picked supplier/products' labels up front too, in the same shape
        // `ProductSearchController` returns, so the picker can show them without a search happening first.
        $initialProducts = Product::query()
            ->whereIn('id', $purchase->items->pluck('product_id'))
            ->get(['id', 'name', 'sku', 'barcode', 'selling_price', 'avg_cost', 'current_stock', 'track_serial_number', 'has_installation_service']);

        return Inertia::render('purchases/edit', [
            'purchase' => [
                'id' => $purchase->id,
                'supplier_id' => $purchase->supplier_id,
                'purchase_date' => $purchase->purchase_date->toDateString(),
                'status' => $purchase->status,
                'items' => $purchase->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                ]),
            ],
            'initialSupplier' => $purchase->supplier->only(['id', 'name', 'phone', 'business_name', 'balance']),
            'initialProducts' => $initialProducts,
        ]);
    }

    public function update(UpdatePurchaseRequest $request, Purchase $purchase, UpdatePurchaseAction $updatePurchase): RedirectResponse
    {
        if (! $purchase->canEdit()) {
            return back()->withErrors(['purchase' => 'This purchase has already been received and can no longer be edited directly.']);
        }

        $updatePurchase->execute($purchase, $request->validated());

        return to_route('purchases.show', $purchase);
    }

    /**
     * Only Draft/Ordered purchases (no stock movement yet) can be deleted.
     */
    public function destroy(Purchase $purchase): RedirectResponse
    {
        if (! $purchase->canEdit()) {
            return back()->withErrors(['purchase' => 'This purchase has already been received and cannot be deleted.']);
        }

        $purchase->delete();

        return to_route('purchases.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Purchase $purchase): array
    {
        return [
            'id' => $purchase->id,
            'invoice_no' => $purchase->invoice_no,
            'supplier' => $purchase->supplier->only(['id', 'name', 'phone', 'balance']),
            'creator' => $purchase->creator?->only(['id', 'name']),
            'purchase_date' => $purchase->purchase_date->toDateString(),
            'total_amount' => $purchase->total_amount,
            'paid_amount' => $purchase->paid_amount,
            'due_amount' => $purchase->due_amount,
            'payment_status' => $purchase->payment_status,
            'status' => $purchase->status,
            'can_edit' => $purchase->canEdit(),
            'items' => $purchase->items->map(fn ($item) => [
                'id' => $item->id,
                'product' => $item->product->only(['id', 'name', 'sku', 'track_serial_number']),
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'subtotal' => $item->subtotal,
            ]),
        ];
    }
}
