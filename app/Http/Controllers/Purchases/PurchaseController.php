<?php

namespace App\Http\Controllers\Purchases;

use App\Actions\Purchases\Purchase\CreatePurchaseAction;
use App\Actions\Purchases\Purchase\ReopenPurchaseForAmendmentAction;
use App\Actions\Purchases\Purchase\SettlePurchaseOnSaveAction;
use App\Actions\Purchases\Purchase\UpdatePurchaseAction;
use App\Enums\PurchaseStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Common\BulkDestroyRequest;
use App\Http\Requests\Purchases\Purchase\StorePurchaseRequest;
use App\Http\Requests\Purchases\Purchase\UpdatePurchaseRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Settings;
use App\Queries\Purchase\PurchaseQuery;
use App\Support\BulkDelete;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
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
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
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
            'created_at' => $purchase->created_at?->toIso8601String(),
            'total_amount' => $purchase->total_amount,
            'paid_amount' => $purchase->paid_amount,
            'due_amount' => $purchase->due_amount,
            'payment_status' => $purchase->payment_status,
            'status' => $purchase->status,
            'added_by' => $purchase->creator?->name,
            'can_edit' => $purchase->canEdit(),
            'can_amend' => $purchase->amendBlockReason() === null,
        ]);

        $statsQuery = PurchaseQuery::filtered($validated, $request->user());
        $stats = [
            'total_purchases' => (clone $statsQuery)->count(),
            'total_amount' => (float) (clone $statsQuery)->sum('total_amount'),
            'total_paid' => (float) (clone $statsQuery)->sum('paid_amount'),
            'total_due' => (float) (clone $statsQuery)->sum('due_amount'),
        ];

        return Inertia::render('purchases/index', [
            'purchases' => $purchases,
            'stats' => $stats,
            // Only the currently-filtered supplier's own label, not every supplier —
            // the filter itself searches async (see `ContactSearchController`).
            'initialSupplier' => isset($validated['supplier_id'])
                ? Contact::query()->find($validated['supplier_id'])?->only(['id', 'name', 'display_name', 'phone', 'business_name', 'balance'])
                : null,
            'filters' => [
                'search' => $validated['search'] ?? null,
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'status' => $validated['status'] ?? null,
                'payment_status' => $validated['payment_status'] ?? null,
                'sort' => $validated['sort'] ?? 'purchase_date',
                'direction' => $validated['direction'] ?? 'desc',
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
    public function create(Request $request): Response
    {
        $supplierId = $request->query('supplier_id') ?? $request->query('contact_id');
        $initialSupplier = $supplierId
            ? Contact::query()->whereIn('type', ['supplier', 'both'])->find($supplierId)?->only(['id', 'name', 'display_name', 'phone', 'business_name', 'balance'])
            : null;

        return Inertia::render('purchases/create', [
            'initialSupplier' => $initialSupplier,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
            // "Add Purchase" from a product's row menu arrives with that product pre-picked
            'initialProducts' => $request->integer('product_id')
                ? Product::query()
                    ->whereKey($request->integer('product_id'))
                    ->get(['id', 'name', 'sku', 'barcode', 'selling_price', 'avg_cost', 'current_stock', 'track_serial_number', 'has_installation_service'])
                : [],
        ]);
    }

    /**
     * Saving as `received` stores a Draft and receives it in the same transaction (stock/ledger move
     * through ConfirmPurchaseAction); a payment entered on the form is recorded in every status. If the
     * receipt or the payment fails — bad serials, overpayment — nothing is saved.
     */
    public function store(StorePurchaseRequest $request, CreatePurchaseAction $createPurchase, SettlePurchaseOnSaveAction $settle): RedirectResponse
    {
        $data = $request->validated();
        $receiveNow = $data['status'] === 'received';

        $purchase = DB::transaction(function () use ($data, $receiveNow, $createPurchase, $settle) {
            $purchase = $createPurchase->execute([...$data, 'status' => $receiveNow ? 'draft' : $data['status']]);

            return $settle->execute($purchase, $data, $receiveNow);
        });

        return to_route('purchases.index');
    }

    public function show(Purchase $purchase): Response
    {
        $purchase->load(['supplier:id,name,phone,balance', 'creator:id,name', 'items.product:id,name,sku,track_serial_number', 'items' => fn ($query) => $query->orderBy('id')]);

        return Inertia::render('purchases/show', [
            'purchase' => $this->present($purchase),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }

    public function edit(Request $request, Purchase $purchase): Response
    {
        // A Draft/Ordered purchase is edited freely; a Received one is amended (taken out and received again) by whoever may edit purchases.
        $amending = ! $purchase->canEdit();
        abort_if($amending && (! $request->user()->can('purchase.edit') || $purchase->amendBlockReason() !== null), 403);

        $purchase->load(['items.serialNumbers', 'supplier:id,name,phone,business_name,balance']);

        // The async Product picker (doc/corrections2.md #8) only knows about whatever's been searched —
        // an edit form needs its already-picked supplier/products' labels up front too, in the same shape
        // `ProductSearchController` returns, so the picker can show them without a search happening first.
        $initialProducts = Product::query()
            ->whereIn('id', $purchase->items->pluck('product_id'))
            ->get(['id', 'name', 'sku', 'barcode', 'selling_price', 'avg_cost', 'current_stock', 'track_serial_number', 'has_installation_service']);

        return Inertia::render('purchases/edit', [
            'purchase' => [
                'id' => $purchase->id,
                'invoice_no' => $purchase->invoice_no,
                'supplier_id' => $purchase->supplier_id,
                'purchase_date' => $purchase->purchase_date->toDateString(),
                'status' => $purchase->status,
                // An amendment takes the old payments back out first, so it starts from nothing paid and the rows below.
                'paid_amount' => $amending ? 0 : $purchase->paid_amount,
                'amending' => $amending,
                'payments' => $amending ? $purchase->paidPerAccount() : [],
                'serial_numbers' => $amending
                    ? $purchase->items->values()->mapWithKeys(fn ($item, $index) => [$index => $item->serialNumbers->pluck('serial_number')->all()])->all()
                    : (object) [],
                'discount_type' => $purchase->discount_type?->value,
                'discount_value' => $purchase->discount_value,
                'items' => $purchase->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'original_price' => $item->original_price,
                    'unit_price' => $item->unit_price,
                    'discount_type' => $item->discount_type?->value,
                    'discount_value' => $item->discount_value,
                ]),
            ],
            'initialSupplier' => $purchase->supplier->only(['id', 'name', 'display_name', 'phone', 'business_name', 'balance']),
            'initialProducts' => $initialProducts,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }

    public function update(
        UpdatePurchaseRequest $request,
        Purchase $purchase,
        UpdatePurchaseAction $updatePurchase,
        SettlePurchaseOnSaveAction $settle,
        ReopenPurchaseForAmendmentAction $reopenPurchase,
    ): RedirectResponse {
        if (! $purchase->canEdit()) {
            return $this->amend($request, $purchase, $updatePurchase, $settle, $reopenPurchase);
        }

        $data = $request->validated();
        $receiveNow = $data['status'] === 'received';

        DB::transaction(function () use ($purchase, $data, $receiveNow, $updatePurchase, $settle) {
            $updatePurchase->execute($purchase, [...$data, 'status' => $receiveNow ? 'draft' : $data['status']]);

            $settle->execute($purchase->refresh(), $data, $receiveNow);
        });

        return to_route('purchases.show', $purchase);
    }

    /**
     * Editing a Received purchase: take the receipt out, save the corrected version on the same invoice and receive it
     * again — all in one transaction, so a failure (a serial already sold, stock that cannot cover what was sold since,
     * a closed period) leaves the original purchase untouched.
     */
    private function amend(UpdatePurchaseRequest $request, Purchase $purchase, UpdatePurchaseAction $updatePurchase, SettlePurchaseOnSaveAction $settle, ReopenPurchaseForAmendmentAction $reopenPurchase): RedirectResponse
    {
        $data = $request->validated();
        $reason = (string) $data['amend_reason'];

        DB::transaction(function () use ($purchase, $data, $reason, $updatePurchase, $settle, $reopenPurchase) {
            $before = $purchase->items()->pluck('product_id');
            $valuesBefore = $reopenPurchase->snapshotValues($purchase);

            $purchase = $reopenPurchase->execute($purchase, $reason);
            $updatePurchase->execute($purchase, [...$data, 'status' => 'draft']);
            $purchase = $settle->execute($purchase->refresh(), $data, true);

            // Units of the old receipt that were already sold now cost what the corrected receipt says; keep the books in step.
            $reopenPurchase->settleValueDrift($purchase, $valuesBefore);

            $this->assertStockIsWhole($before->merge($purchase->items()->pluck('product_id'))->unique());
        });

        return to_route('purchases.show', $purchase);
    }

    /**
     * Taking the old receipt out may leave the stock below what was already sold from it; the corrected receipt has to
     * bring it back to at least zero, otherwise the amendment would invent units that were sold but never bought.
     *
     * @param  Collection<int, int>  $productIds
     *
     * @throws ValidationException
     */
    private function assertStockIsWhole(Collection $productIds): void
    {
        $short = Product::query()
            ->whereIn('id', $productIds)
            ->where('manage_stock', true)
            ->where('current_stock', '<', 0)
            ->pluck('name');

        if ($short->isNotEmpty()) {
            throw ValidationException::withMessages([
                'items' => 'Part of this purchase was already sold, so the quantity cannot go below what has been sold: '.$short->implode(', ').'.',
            ]);
        }
    }

    /**
     * Only Draft/Ordered purchases (no stock movement yet) can be deleted.
     */
    public function destroy(Purchase $purchase): RedirectResponse
    {
        if ($reason = $purchase->deletionBlockReason()) {
            return back()->withErrors(['purchase' => $reason]);
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
            'subtotal' => $purchase->subtotal,
            'discount_type' => $purchase->discount_type?->value,
            'discount_value' => $purchase->discount_value,
            'discount_amount' => $purchase->discount_amount,
            'total_amount' => $purchase->total_amount,
            'paid_amount' => $purchase->paid_amount,
            'due_amount' => $purchase->due_amount,
            'payment_status' => $purchase->payment_status,
            'status' => $purchase->status,
            'can_edit' => $purchase->canEdit(),
            'can_amend' => $purchase->amendBlockReason() === null,
            // The price alone can be corrected on any received purchase without a return, even when goods are sold.
            'can_adjust_cost' => $purchase->status === PurchaseStatus::Received && ! $purchase->returns()->exists(),
            'items' => $purchase->items->map(fn ($item) => [
                'id' => $item->id,
                'product' => $item->product->only(['id', 'name', 'sku', 'track_serial_number']),
                'quantity' => $item->quantity,
                'original_price' => $item->original_price,
                'unit_price' => $item->unit_price,
                'discount_type' => $item->discount_type?->value,
                'discount_value' => $item->discount_value,
                'discount_amount' => $item->discount_amount,
                'subtotal' => $item->subtotal,
            ]),
        ];
    }

    /**
     * "Delete selected" — each record is checked by the same rule as the single delete.
     */
    public function bulkDestroy(BulkDestroyRequest $request): RedirectResponse
    {
        $user = $request->user();

        return BulkDelete::respond(BulkDelete::run(
            $request->validated('ids'),
            Purchase::query()
                ->whereIn('id', $request->validated('ids'))
                ->when(! $user->can('purchase.view_all'), fn ($query) => $query->where('created_by', $user->id))
                ->get(),
            fn (Purchase $purchase) => $purchase->deletionBlockReason(),
            fn (Purchase $purchase) => $purchase->delete(),
        ));
    }
}
