<?php

namespace App\Http\Controllers;

use App\Actions\PurchaseReturn\CreatePurchaseReturnAction;
use App\Enums\PurchaseStatus;
use App\Http\Requests\PurchaseReturn\StorePurchaseReturnRequest;
use App\Models\Account;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseReturnController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $returns = PurchaseReturn::query()
            ->with('supplier:id,name', 'purchase:id,invoice_no')
            ->when($validated['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('return_date', '>=', $from))
            ->when($validated['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('return_date', '<=', $to))
            ->orderByDesc('return_date')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        $returns->getCollection()->transform(fn (PurchaseReturn $return) => [
            'id' => $return->id,
            'purchase' => $return->purchase->only(['id', 'invoice_no']),
            'supplier' => $return->supplier->only(['id', 'name']),
            'return_date' => $return->return_date->toDateString(),
            'total_amount' => $return->total_amount,
        ]);

        return Inertia::render('purchase-returns/index', [
            'returns' => $returns,
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $purchase = Purchase::query()
            ->with(['items.product:id,name,sku', 'items.returnItems', 'supplier:id,name'])
            ->where('status', PurchaseStatus::Received)
            ->findOrFail($request->integer('purchase_id'));

        return Inertia::render('purchase-returns/create', [
            'purchase' => [
                'id' => $purchase->id,
                'invoice_no' => $purchase->invoice_no,
                'supplier' => $purchase->supplier->only(['id', 'name']),
                'items' => $purchase->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product' => $item->product->only(['id', 'name', 'sku']),
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'already_returned' => $item->returnItems->sum('quantity'),
                ])->filter(fn (array $item) => $item['already_returned'] < $item['quantity'])->values(),
            ],
        ]);
    }

    public function store(StorePurchaseReturnRequest $request, CreatePurchaseReturnAction $createReturn): RedirectResponse
    {
        $return = $createReturn->execute($request->validated());

        return to_route('purchase-returns.show', $return);
    }

    public function show(PurchaseReturn $purchaseReturn): Response
    {
        $purchaseReturn->load(['purchase:id,invoice_no', 'supplier:id,name,phone,balance', 'items.product:id,name,sku']);

        return Inertia::render('purchase-returns/show', [
            'return' => [
                'id' => $purchaseReturn->id,
                'purchase' => $purchaseReturn->purchase->only(['id', 'invoice_no']),
                'supplier' => $purchaseReturn->supplier->only(['id', 'name', 'phone', 'balance']),
                'return_date' => $purchaseReturn->return_date->toDateString(),
                'total_amount' => $purchaseReturn->total_amount,
                'reason' => $purchaseReturn->reason,
                'items' => $purchaseReturn->items->map(fn ($item) => [
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
