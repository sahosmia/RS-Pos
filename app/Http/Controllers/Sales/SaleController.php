<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\Sale\ConfirmSaleAction;
use App\Actions\Sales\Sale\CreateSaleAction;
use App\Actions\Sales\Sale\ReopenSaleForAmendmentAction;
use App\Actions\Sales\Sale\UpdateSaleAction;
use App\Enums\DateRangePreset;
use App\Enums\EmiInstallmentStatus;
use App\Enums\SalePaymentType;
use App\Exceptions\InvalidSerialSelectionException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Common\BulkDestroyRequest;
use App\Http\Requests\Sales\Sale\StoreSaleRequest;
use App\Http\Requests\Sales\Sale\UpdateSaleRequest;
use App\Models\Contact;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Settings;
use App\Queries\Sale\SaleQuery;
use App\Queries\Sale\SalesFormOptions;
use App\Support\BulkDelete;
use App\Support\SalePaymentHistory;
use App\Support\SerialSelections;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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
            'search' => ['nullable', 'string', 'max:255'],
            'preset' => ['nullable', Rule::in(['all', ...array_column(DateRangePreset::cases(), 'value')])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'customer_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'status' => ['nullable', 'in:draft,quotation,confirmed,cancelled'],
            'payment_status' => ['nullable', 'in:due,partial,paid'],
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $range = DateRangePreset::forList($validated['preset'] ?? null, $validated['from'] ?? null, $validated['to'] ?? null);
        $validated = [...$validated, 'from' => $range['start'], 'to' => $range['end']];

        $sales = SaleQuery::filtered($validated, $request->user())
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $sales->getCollection()->transform(fn (Sale $sale) => [
            'id' => $sale->id,
            'invoice_no' => $sale->invoice_no,
            'customer' => $sale->customer->only(['id', 'name', 'phone']),
            'sale_date' => $sale->sale_date->toDateString(),
            'created_at' => $sale->created_at?->toIso8601String(),
            'total_amount' => $sale->total_amount,
            'due_amount' => $sale->due_amount,
            'payment_status' => $sale->payment_status,
            'status' => $sale->status,
            'source' => $sale->source,
            'added_by' => $sale->creator?->name,
            'can_edit' => $sale->canEdit(),
            'can_amend' => $sale->amendBlockReason() === null,
        ]);

        $statsQuery = SaleQuery::filtered($validated, $request->user());
        $stats = [
            'total_sales' => (clone $statsQuery)->count(),
            'total_amount' => (float) (clone $statsQuery)->sum('total_amount'),
            'total_paid' => (float) (clone $statsQuery)->sum('paid_amount'),
            'total_due' => (float) (clone $statsQuery)->sum('due_amount'),
        ];

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'stats' => $stats,
            'accounts' => SalesFormOptions::activeAccounts(),
            // Only the currently-filtered customer's own label, not every customer —
            // the filter itself searches async (see `ContactSearchController`).
            'initialCustomer' => isset($validated['customer_id'])
                ? Contact::query()->find($validated['customer_id'])?->only(['id', 'name', 'display_name', 'phone', 'business_name', 'balance'])
                : null,
            'filters' => [
                'search' => $validated['search'] ?? null,
                'preset' => $range['preset'],
                'from' => $range['from'],
                'to' => $range['to'],
                'customer_id' => $validated['customer_id'] ?? null,
                'status' => $validated['status'] ?? null,
                'payment_status' => $validated['payment_status'] ?? null,
                'sort' => $validated['sort'] ?? 'sale_date',
                'direction' => $validated['direction'] ?? 'desc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $customerId = $request->query('customer_id') ?? $request->query('contact_id');
        $initialCustomer = $customerId
            ? Contact::query()->whereIn('type', ['customer', 'both'])->find($customerId)?->only(['id', 'name', 'display_name', 'phone', 'business_name', 'balance'])
            : null;

        return Inertia::render('sales/create', [
            'initialCustomer' => $initialCustomer,
            'products' => SalesFormOptions::productsForSale(),
            'accounts' => SalesFormOptions::activeAccounts(),
            // "Add Sale" from a product's row menu arrives with that product pre-picked
            'initialProductId' => $request->integer('product_id') ?: null,
        ]);
    }

    /**
     * A single "Confirm Sale" click on the Add Sale page creates the sale
     * and confirms it in the same request — `status: confirmed` here is
     * shorthand for "create as Draft, then immediately run
     * ConfirmSaleAction", so stock/ledger/account only ever move through
     * that one action.
     */
    public function store(StoreSaleRequest $request, CreateSaleAction $createSale, ConfirmSaleAction $confirmSale): RedirectResponse
    {
        $data = $request->validated();
        $wantsConfirm = $data['status'] === 'confirmed';
        $data['status'] = $wantsConfirm ? 'draft' : $data['status'];

        // One transaction: a confirm that fails (bad serials, ...) must not leave a half-made Draft behind.
        $sale = DB::transaction(function () use ($data, $wantsConfirm, $createSale, $confirmSale) {
            $sale = $createSale->execute($data);

            return $wantsConfirm ? $this->confirmFromForm($sale, $data, $confirmSale) : $sale;
        });

        // A new sale goes back to the list. "Save & WhatsApp" still needs the figures of the sale it just made, so they ride along once.
        return to_route('sales.index')->with('savedSale', $wantsConfirm ? $this->savedSaleFigures($sale) : null);
    }

    public function show(Sale $sale): Response
    {
        $sale->load([
            'customer:id,name,phone,email,address,balance',
            'creator:id,name',
            'items.product:id,name,sku,unit_id',
            'items.product.unit:id,name',
            'items.serialNumbers',
            'items' => fn ($query) => $query->orderBy('id'),
            'emiInstallments',
        ]);

        $settings = Settings::current();

        return Inertia::render('sales/show', [
            'sale' => $this->present($sale),
            'accounts' => SalesFormOptions::activeAccounts(),
            'justConfirmed' => (bool) session('justConfirmed'),
            'invoiceSettings' => $settings->invoiceSettingsOrDefault(),
            'invoiceLogoUrl' => $settings->getFirstMediaUrl('invoice_logo') ?: null,
            // Not called `shop`: that name is the shared prop (modules, theme, menu order) the sidebar reads.
            'invoiceShop' => [
                'name' => $settings->shop_name,
                'address' => $settings->shop_address,
                'phone' => $settings->shop_phone,
            ],
        ]);
    }

    public function edit(Request $request, Sale $sale): Response
    {
        // A Draft/Quotation is edited freely; a Confirmed sale is amended (reversed and recorded again) by whoever may edit sales.
        $amending = ! $sale->canEdit();
        abort_if($amending && (! $request->user()->can('sale.edit') || $sale->amendBlockReason() !== null), 403);

        $sale->load(['items.product:id,warranty_period_months', 'items.serialNumbers', 'customer:id,name,phone,business_name,balance']);

        return Inertia::render('sales/edit', [
            'sale' => [
                'id' => $sale->id,
                'customer_id' => $sale->customer_id,
                'sale_date' => $sale->sale_date->toDateString(),
                'status' => $sale->status,
                'discount_type' => $sale->discount_type,
                'discount_value' => $sale->discount_value,
                'valid_until' => $sale->valid_until?->toDateString(),
                'financing_type' => $sale->financing_type,
                'installment_count' => $sale->installment_count,
                'emi_interest_method' => $sale->emi_interest_method,
                'emi_annual_rate' => $sale->emi_annual_rate,
                'emi_frequency' => $sale->emi_frequency,
                'emi_tenure_value' => $sale->emi_tenure_value,
                'emi_tenure_unit' => $sale->emi_tenure_unit,
                'emi_installation_upfront' => $sale->emi_installation_upfront,
                'amending' => $amending,
                // What was received, per account — the starting point of the corrected payment rows.
                'payments' => $amending ? $sale->receivedPerAccount() : [],
                'items' => $sale->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'original_price' => $item->original_price,
                    'unit_price' => $item->unit_price,
                    'discount_type' => $item->discount_type,
                    'discount_value' => $item->discount_value,
                    'installation_required' => $item->installation_required,
                    'installation_charge' => $item->installation_charge,
                    'emi_financed' => $item->emi_financed,
                    // A draft that never chose shows the product's warranty as the default to keep or change.
                    'warranty_months' => $item->warranty_months ?? $item->product?->warranty_period_months ?? 0,
                    'service_plan_included' => $item->service_plan_included,
                    'note' => $item->note,
                    // A Draft has none (picked at confirm time, see SaleTotals); an amended sale starts from the units it sold.
                    'serial_numbers' => $amending ? $item->serialNumbers->pluck('serial_number')->all() : [],
                ]),
            ],
            'initialCustomer' => $sale->customer->only(['id', 'name', 'display_name', 'phone', 'business_name', 'balance']),
            'products' => SalesFormOptions::productsForSale(),
            'accounts' => SalesFormOptions::activeAccounts(),
        ]);
    }

    public function update(
        UpdateSaleRequest $request,
        Sale $sale,
        UpdateSaleAction $updateSale,
        ConfirmSaleAction $confirmSale,
        ReopenSaleForAmendmentAction $reopenSale,
    ): RedirectResponse {
        if (! $sale->canEdit()) {
            return $this->amend($request, $sale, $updateSale, $confirmSale, $reopenSale);
        }

        $data = $request->validated();
        $wantsConfirm = $data['status'] === 'confirmed';
        $data['status'] = $wantsConfirm ? 'draft' : $data['status'];

        $sale = DB::transaction(function () use ($sale, $data, $wantsConfirm, $updateSale, $confirmSale) {
            $sale = $updateSale->execute($sale, $data);

            return $wantsConfirm ? $this->confirmFromForm($sale, $data, $confirmSale) : $sale;
        });

        return to_route('sales.show', $sale)->with('justConfirmed', $wantsConfirm)->with('savedSale', $wantsConfirm ? $this->savedSaleFigures($sale) : null);
    }

    /**
     * Editing a Confirmed sale: reverse it, save the corrected version on the same invoice and confirm it again — all in
     * one transaction, so a failure (not enough stock, a bad serial, a closed period) leaves the original sale untouched.
     */
    private function amend(UpdateSaleRequest $request, Sale $sale, UpdateSaleAction $updateSale, ConfirmSaleAction $confirmSale, ReopenSaleForAmendmentAction $reopenSale): RedirectResponse
    {
        $data = $request->validated();
        $reason = (string) $data['amend_reason'];
        $data['status'] = 'draft';

        $sale = DB::transaction(function () use ($sale, $data, $reason, $updateSale, $confirmSale, $reopenSale) {
            // Taken before the sale is reopened: units sold again keep the cost they were first sold at.
            $keptCosts = $reopenSale->costsToKeep($sale);

            $sale = $reopenSale->execute($sale, $reason);
            $sale = $updateSale->execute($sale, $data);

            return $this->confirmFromForm($sale, $data, $confirmSale, $keptCosts);
        });

        return to_route('sales.show', $sale)->with('savedSale', $this->savedSaleFigures($sale));
    }

    /**
     * What "Save & WhatsApp" needs to word its message — flashed for the one page that follows a save.
     *
     * @return array{invoice_no: string, total_amount: float, due_amount: float, customer_balance: float}
     */
    private function savedSaleFigures(Sale $sale): array
    {
        return [
            'invoice_no' => $sale->invoice_no,
            'total_amount' => $sale->total_amount,
            'due_amount' => $sale->due_amount,
            'customer_balance' => $sale->customer->fresh()->balance,
        ];
    }

    /**
     * Confirms the sale the form just saved. Bad serial numbers come back as a validation error on the
     * \`items.N.serial_numbers\` field of the line they were typed on, so the form shows the message under that input.
     *
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    private function confirmFromForm(Sale $sale, array $data, ConfirmSaleAction $confirmSale, array $keptCosts = []): Sale
    {
        $lineItems = $sale->items()->orderBy('id')->get();

        try {
            return $confirmSale->execute($sale, $data['payments'] ?? [], SerialSelections::extract($lineItems, $data['items']), $keptCosts);
        } catch (InvalidSerialSelectionException $e) {
            throw $this->serialValidationError($e, $lineItems);
        }
    }

    /**
     * @param  Collection<int, SaleItem>  $lineItems
     */
    private function serialValidationError(InvalidSerialSelectionException $e, Collection $lineItems): ValidationException
    {
        $index = $e->itemId === null ? false : $lineItems->search(fn (SaleItem $item) => $item->id === $e->itemId);

        return ValidationException::withMessages([
            $index === false ? 'error' : "items.{$index}.serial_numbers" => $e->getMessage(),
        ]);
    }

    /**
     * Only Draft/Quotation sales (no stock movement yet) can be deleted.
     */
    public function destroy(Sale $sale): RedirectResponse
    {
        if ($reason = $sale->deletionBlockReason()) {
            return back()->withErrors(['sale' => $reason]);
        }

        $sale->delete();

        return to_route('sales.index');
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * The sale's installment plan for the invoice page: the terms, the schedule and which installment is next.
     * Null for a sale that isn't on EMI (or whose schedule hasn't been created yet, i.e. a draft).
     *
     * @return array<string, mixed>|null
     */
    private function presentEmi(Sale $sale): ?array
    {
        if ($sale->financing_type !== SalePaymentType::Emi || $sale->emiInstallments->isEmpty()) {
            return null;
        }

        $installments = $sale->emiInstallments->sortBy('installment_number')->values();
        $open = $installments->filter(fn ($i) => in_array($i->status, [EmiInstallmentStatus::Pending, EmiInstallmentStatus::Overdue], true));
        $next = $open->sortBy('due_date')->first();

        return [
            'interest_method' => $sale->emi_interest_method,
            'annual_rate' => $sale->emi_annual_rate,
            'frequency' => $sale->emi_frequency,
            'interest_total' => $sale->emi_interest_total,
            // What was financed vs. paid now, so the invoice can show "AC on EMI, the rest paid".
            'financed_goods' => $sale->emiFinancedGoods(),
            'installments_total' => $installments->count(),
            'installments_open' => $open->count(),
            'next' => $next ? [
                'id' => $next->id,
                'number' => $next->installment_number,
                'due_date' => $next->due_date->toDateString(),
                'remaining' => round($next->amount - $next->paid_amount, 2),
                'overdue' => $next->due_date->isBefore(today()),
            ] : null,
            'installments' => $installments->map(fn ($i) => [
                'id' => $i->id,
                'number' => $i->installment_number,
                'due_date' => $i->due_date->toDateString(),
                'amount' => $i->amount,
                'principal' => $i->principal_amount,
                'interest' => $i->interest_amount,
                'paid_amount' => $i->paid_amount,
                'status' => $i->status,
            ])->all(),
        ];
    }

    private function present(Sale $sale): array
    {
        return [
            'id' => $sale->id,
            'invoice_no' => $sale->invoice_no,
            'customer' => $sale->customer->only(['id', 'name', 'phone', 'email', 'address', 'balance']),
            'creator' => $sale->creator?->only(['id', 'name']),
            'sale_date' => $sale->sale_date->toDateString(),
            'subtotal' => $sale->subtotal,
            'installation_amount' => $sale->installation_amount,
            'discount_type' => $sale->discount_type,
            'discount_value' => $sale->discount_value,
            'discount_amount' => $sale->discount_amount,
            'total_amount' => $sale->total_amount,
            'paid_amount' => $sale->paid_amount,
            'waived_amount' => $sale->waivedAmount(),
            'due_amount' => $sale->due_amount,
            'payment_status' => $sale->payment_status,
            'status' => $sale->status,
            'source' => $sale->source,
            'can_edit' => $sale->canEdit(),
            'can_amend' => $sale->amendBlockReason() === null,
            'payment_history' => SalePaymentHistory::forSale($sale),
            'emi' => $this->presentEmi($sale),
            'items' => $sale->items->map(fn ($item) => [
                'id' => $item->id,
                'product' => [
                    ...$item->product->only(['id', 'name', 'sku']),
                    'unit' => $item->product->unit?->only(['id', 'name']),
                ],
                'quantity' => $item->quantity,
                'original_price' => $item->original_price,
                'unit_price' => $item->unit_price,
                'discount_type' => $item->discount_type,
                'discount_value' => $item->discount_value,
                'discount_amount' => $item->discount_amount,
                'subtotal' => $item->subtotal,
                'installation_required' => $item->installation_required,
                'installation_charge' => $item->installation_charge,
                'emi_financed' => $item->emi_financed,
                'warranty_months' => $item->warranty_months,
                'warranty_expires_at' => $item->warranty_expires_at?->toDateString(),
                'serial_numbers' => $item->serialNumbers->pluck('serial_number')->all(),
                'serials' => $item->serialNumbers->map(fn ($serial) => [
                    'serial_number' => $serial->serial_number,
                    'status' => $serial->status->value,
                ])->values()->all(),
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
            Sale::query()
                ->whereIn('id', $request->validated('ids'))
                ->when(! $user->can('sale.view_all'), fn ($query) => $query->where('created_by', $user->id))
                ->get(),
            fn (Sale $sale) => $sale->deletionBlockReason(),
            fn (Sale $sale) => $sale->delete(),
        ));
    }
}
