<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\SaleReturn\CreateSaleReturnAction;
use App\Enums\SaleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\SaleReturn\StoreSaleReturnRequest;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Settings;
use App\Queries\Sale\SaleReturnQuery;
use App\Queries\Sale\SalesFormOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SaleReturnController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $returns = SaleReturnQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $returns->getCollection()->transform(fn (SaleReturn $return) => [
            'id' => $return->id,
            'sale' => $return->sale->only(['id', 'invoice_no']),
            'customer' => $return->customer->only(['id', 'name']),
            'return_date' => $return->return_date->toDateString(),
            'total_amount' => $return->total_amount,
            'added_by' => $return->creator?->name,
        ]);

        return Inertia::render('sales/sale-returns/index', [
            'returns' => $returns,
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'sort' => $validated['sort'] ?? 'return_date',
                'direction' => $validated['direction'] ?? 'desc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $sale = Sale::query()
            ->with(['items.product:id,name,sku', 'items.returnItems', 'customer:id,name'])
            ->where('status', SaleStatus::Confirmed)
            ->findOrFail($request->integer('sale_id'));

        return Inertia::render('sales/sale-returns/create', [
            'sale' => [
                'id' => $sale->id,
                'invoice_no' => $sale->invoice_no,
                'customer' => $sale->customer->only(['id', 'name']),
                'items' => $sale->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product' => $item->product->only(['id', 'name', 'sku']),
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'already_returned' => $item->returnItems->sum('quantity'),
                ])->filter(fn (array $item) => $item['already_returned'] < $item['quantity'])->values(),
            ],
        ]);
    }

    public function store(StoreSaleReturnRequest $request, CreateSaleReturnAction $createReturn): RedirectResponse
    {
        $return = $createReturn->execute($request->validated());

        return to_route('sale-returns.show', $return);
    }

    public function show(SaleReturn $saleReturn): Response
    {
        $saleReturn->load(['sale:id,invoice_no', 'customer:id,name,phone,balance', 'items.product:id,name,sku']);

        return Inertia::render('sales/sale-returns/show', [
            'return' => [
                'id' => $saleReturn->id,
                'sale' => $saleReturn->sale->only(['id', 'invoice_no']),
                'customer' => $saleReturn->customer->only(['id', 'name', 'phone', 'balance']),
                'return_date' => $saleReturn->return_date->toDateString(),
                'total_amount' => $saleReturn->total_amount,
                'refunded_amount' => $saleReturn->refunded_amount,
                'remaining_refundable' => round($saleReturn->total_amount - $saleReturn->refunded_amount, 2),
                'reason' => $saleReturn->reason,
                'items' => $saleReturn->items->map(fn ($item) => [
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
