<?php

namespace App\Http\Controllers;

use App\Actions\Purchase\CreatePurchaseAction;
use App\Actions\Purchase\UpdatePurchaseAction;
use App\Http\Requests\Purchase\StorePurchaseRequest;
use App\Http\Requests\Purchase\UpdatePurchaseRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Purchase;
use Illuminate\Database\Eloquent\Builder;
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
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'supplier_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'status' => ['nullable', 'in:draft,ordered,received,cancelled'],
            'payment_status' => ['nullable', 'in:due,partial,paid'],
        ]);

        $purchases = Purchase::query()
            ->with('supplier:id,name')
            ->when($validated['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('purchase_date', '>=', $from))
            ->when($validated['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('purchase_date', '<=', $to))
            ->when($validated['supplier_id'] ?? null, fn (Builder $query, int $id) => $query->where('supplier_id', $id))
            ->when($validated['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($validated['payment_status'] ?? null, fn (Builder $query, string $status) => $query->where('payment_status', $status))
            ->orderByDesc('purchase_date')
            ->orderByDesc('id')
            ->paginate(20)
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
            'suppliers' => Contact::query()->suppliers()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'status' => $validated['status'] ?? null,
                'payment_status' => $validated['payment_status'] ?? null,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('purchases/create', [
            'suppliers' => Contact::query()->suppliers()->orderBy('name')->get(['id', 'name']),
            'products' => Product::query()->orderBy('name')->get(['id', 'name', 'sku', 'avg_cost']),
        ]);
    }

    public function store(StorePurchaseRequest $request, CreatePurchaseAction $createPurchase): RedirectResponse
    {
        $purchase = $createPurchase->execute($request->validated());

        return to_route('purchases.show', $purchase);
    }

    public function show(Purchase $purchase): Response
    {
        $purchase->load(['supplier:id,name,phone,balance', 'items.product:id,name,sku,track_serial_number', 'items' => fn ($query) => $query->orderBy('id')]);

        return Inertia::render('purchases/show', [
            'purchase' => $this->present($purchase),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance']),
        ]);
    }

    public function edit(Purchase $purchase): Response
    {
        abort_unless($purchase->canEdit(), 403);

        $purchase->load('items');

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
            'suppliers' => Contact::query()->suppliers()->orderBy('name')->get(['id', 'name']),
            'products' => Product::query()->orderBy('name')->get(['id', 'name', 'sku', 'avg_cost']),
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
