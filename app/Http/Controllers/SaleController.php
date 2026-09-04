<?php

namespace App\Http\Controllers;

use App\Actions\Sale\CreateSaleAction;
use App\Actions\Sale\UpdateSaleAction;
use App\Http\Requests\Sale\StoreSaleRequest;
use App\Http\Requests\Sale\UpdateSaleRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    /**
     * Sales list — Draft/Quotation/Confirmed filter the same table.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'customer_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'status' => ['nullable', 'in:draft,quotation,confirmed,cancelled'],
            'payment_status' => ['nullable', 'in:due,partial,paid'],
        ]);

        $sales = Sale::query()
            ->with('customer:id,name')
            ->when($validated['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('sale_date', '>=', $from))
            ->when($validated['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('sale_date', '<=', $to))
            ->when($validated['customer_id'] ?? null, fn (Builder $query, int $id) => $query->where('customer_id', $id))
            ->when($validated['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($validated['payment_status'] ?? null, fn (Builder $query, string $status) => $query->where('payment_status', $status))
            ->orderByDesc('sale_date')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        $sales->getCollection()->transform(fn (Sale $sale) => [
            'id' => $sale->id,
            'invoice_no' => $sale->invoice_no,
            'customer' => $sale->customer->only(['id', 'name']),
            'sale_date' => $sale->sale_date->toDateString(),
            'total_amount' => $sale->total_amount,
            'due_amount' => $sale->due_amount,
            'payment_status' => $sale->payment_status,
            'status' => $sale->status,
            'source' => $sale->source,
            'can_edit' => $sale->canEdit(),
        ]);

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'customers' => Contact::query()->customers()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'customer_id' => $validated['customer_id'] ?? null,
                'status' => $validated['status'] ?? null,
                'payment_status' => $validated['payment_status'] ?? null,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('sales/create', [
            'customers' => Contact::query()->customers()->orderBy('name')->get(['id', 'name', 'balance']),
            'products' => Product::query()->where('is_for_sale', true)->orderBy('name')
                ->get(['id', 'name', 'sku', 'barcode', 'selling_price', 'current_stock', 'track_serial_number', 'has_installation_service']),
        ]);
    }

    public function store(StoreSaleRequest $request, CreateSaleAction $createSale): RedirectResponse
    {
        $sale = $createSale->execute($request->validated());

        return to_route('sales.show', $sale);
    }

    public function show(Sale $sale): Response
    {
        $sale->load(['customer:id,name,phone,balance', 'items.product:id,name,sku', 'items.serials', 'items' => fn ($query) => $query->orderBy('id')]);

        return Inertia::render('sales/show', [
            'sale' => $this->present($sale),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance']),
        ]);
    }

    public function edit(Sale $sale): Response
    {
        abort_unless($sale->canEdit(), 403);

        $sale->load('items.serials');

        return Inertia::render('sales/edit', [
            'sale' => [
                'id' => $sale->id,
                'customer_id' => $sale->customer_id,
                'sale_date' => $sale->sale_date->toDateString(),
                'status' => $sale->status,
                'discount_type' => $sale->discount_type,
                'discount_value' => $sale->discount_value,
                'valid_until' => $sale->valid_until?->toDateString(),
                'payment_type' => $sale->payment_type,
                'items' => $sale->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'installation_required' => $item->installation_required,
                    'installation_charge' => $item->installation_charge,
                    'note' => $item->note,
                    'serial_numbers' => $item->serials->pluck('serial_number')->all(),
                ]),
            ],
            'customers' => Contact::query()->customers()->orderBy('name')->get(['id', 'name', 'balance']),
            'products' => Product::query()->where('is_for_sale', true)->orderBy('name')
                ->get(['id', 'name', 'sku', 'barcode', 'selling_price', 'current_stock', 'track_serial_number', 'has_installation_service']),
        ]);
    }

    public function update(UpdateSaleRequest $request, Sale $sale, UpdateSaleAction $updateSale): RedirectResponse
    {
        if (! $sale->canEdit()) {
            return back()->withErrors(['sale' => 'This sale has already been confirmed and can no longer be edited directly.']);
        }

        $updateSale->execute($sale, $request->validated());

        return to_route('sales.show', $sale);
    }

    /**
     * Only Draft/Quotation sales (no stock movement yet) can be deleted.
     */
    public function destroy(Sale $sale): RedirectResponse
    {
        if (! $sale->canEdit()) {
            return back()->withErrors(['sale' => 'This sale has already been confirmed and cannot be deleted.']);
        }

        $sale->delete();

        return to_route('sales.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Sale $sale): array
    {
        return [
            'id' => $sale->id,
            'invoice_no' => $sale->invoice_no,
            'customer' => $sale->customer->only(['id', 'name', 'phone', 'balance']),
            'sale_date' => $sale->sale_date->toDateString(),
            'subtotal' => $sale->subtotal,
            'discount_type' => $sale->discount_type,
            'discount_value' => $sale->discount_value,
            'discount_amount' => $sale->discount_amount,
            'total_amount' => $sale->total_amount,
            'paid_amount' => $sale->paid_amount,
            'due_amount' => $sale->due_amount,
            'payment_status' => $sale->payment_status,
            'status' => $sale->status,
            'source' => $sale->source,
            'can_edit' => $sale->canEdit(),
            'items' => $sale->items->map(fn ($item) => [
                'id' => $item->id,
                'product' => $item->product->only(['id', 'name', 'sku']),
                'quantity' => $item->quantity,
                'original_price' => $item->original_price,
                'unit_price' => $item->unit_price,
                'discount_amount' => $item->discount_amount,
                'subtotal' => $item->subtotal,
                'installation_required' => $item->installation_required,
                'installation_charge' => $item->installation_charge,
                'warranty_expires_at' => $item->warranty_expires_at?->toDateString(),
                'serial_numbers' => $item->serials->pluck('serial_number')->all(),
            ]),
        ];
    }
}
