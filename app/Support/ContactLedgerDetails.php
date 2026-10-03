<?php

namespace App\Support;

use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactLedger;
use App\Models\Expense;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SalesOrder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Resolves each `contact_ledger` row's `reference_type`/`reference_id` pair
 * (a plain string + id, not a real `morphTo` — see `LedgerService::recordContact`
 * callers for the exact strings used) into a human label and, for
 * sale/purchase-flavoured entries, the actual product line items — so a
 * customer/supplier's ledger can show "what invoice was this" instead of
 * just an amount. Batched per reference type to avoid an N+1 per row.
 */
class ContactLedgerDetails
{
    /**
     * Only these ledger types represent an actual invoice/return being
     * created — the only moments a product line-item breakdown means
     * anything. A payment/adjustment/credit-applied row shares the same
     * `reference_type`/`reference_id` as the invoice it's settling (so its
     * `reference_label` still resolves correctly), but re-showing that
     * invoice's full item list under a partial-payment row would wrongly
     * suggest the same products moved again for that amount.
     *
     * @var list<ContactLedgerType>
     */
    private const TYPES_WITH_ITEMS = [
        ContactLedgerType::SaleInvoice,
        ContactLedgerType::PurchaseBill,
        ContactLedgerType::SaleReturn,
        ContactLedgerType::PurchaseReturn,
        ContactLedgerType::SalesOrderAdvance,
    ];

    /**
     * The same row shape `ContactController::show()` renders the ledger tab
     * from — shared with `ContactLedgerExportController` so a PDF/Excel
     * download can never drift from what the page displays.
     *
     * With `$from` given, everything before it is folded into a single
     * synthetic "Brought Forward" row (id `0`, no reference/items) carrying
     * the balance at that point — same idea as a bank statement's opening
     * line — so the running balance inside the window still reads correctly
     * without pulling every entry since the contact's very first invoice.
     *
     * @return Collection<int, array{id: int, type: ContactLedgerType, amount: float, note: ?string, reference_type: ?string, reference_id: ?int, reference_label: ?string, items: array<int, array<string, mixed>>, created_at: Carbon, balance: float}>
     */
    public static function rowsFor(Contact $contact, ?Carbon $from = null, ?Carbon $to = null): Collection
    {
        [$query, $broughtForward, $hasEarlierEntries] = self::window($contact, $from, $to);

        $rows = self::rowsFrom($query->get(), $broughtForward);

        return $hasEarlierEntries ? self::carriedRow($broughtForward, $from)->concat($rows) : $rows;
    }

    /**
     * One page (100 entries) of the same ledger, newest page first. The running balance of each
     * page continues from everything before it — summed in the database, not loaded — and any
     * page after the first (or a window with earlier history) opens with a "Brought Forward" row.
     *
     * @return array{rows: Collection<int, array<string, mixed>>, pagination: array{current_page: int, last_page: int, total: int, from: int|null, to: int|null}}
     */
    public static function pageFor(Contact $contact, ?Carbon $from, ?Carbon $to, ?int $requestedPage): array
    {
        [$query, $broughtForward, $hasEarlierEntries] = self::window($contact, $from, $to);

        $page = LedgerPage::of($query, 'amount', $broughtForward, $requestedPage);
        $rows = self::rowsFrom($page['rows'], $page['openingBalance']);

        $isLaterPage = $page['pagination']['current_page'] > 1;

        if ($isLaterPage) {
            $rows = self::carriedRow($page['openingBalance'], $from, 'Carried from the previous page')->concat($rows);
        } elseif ($hasEarlierEntries) {
            $rows = self::carriedRow($broughtForward, $from)->concat($rows);
        }

        return ['rows' => $rows, 'pagination' => $page['pagination']];
    }

    /**
     * The ordered entries inside the window, plus the balance and existence of everything before it.
     *
     * @return array{0: HasMany<ContactLedger, Contact>, 1: float, 2: bool}
     */
    private static function window(Contact $contact, ?Carbon $from, ?Carbon $to): array
    {
        $query = $contact->ledgerEntries()->orderBy('created_at')->orderBy('id');

        $broughtForward = 0.0;
        $hasEarlierEntries = false;
        if ($from !== null) {
            $earlier = (clone $query)->where('created_at', '<', $from);
            $hasEarlierEntries = $earlier->exists();
            $broughtForward = $hasEarlierEntries ? (float) $earlier->sum('amount') : 0.0;
            $query->where('created_at', '>=', $from);
        }
        if ($to !== null) {
            $query->where('created_at', '<=', $to);
        }

        return [$query, $broughtForward, $hasEarlierEntries];
    }

    /**
     * @param  EloquentCollection<int, ContactLedger>  $entries
     * @return Collection<int, array{id: int, type: ContactLedgerType, amount: float, note: ?string, reference_type: ?string, reference_id: ?int, reference_label: ?string, items: array<int, array<string, mixed>>, created_at: Carbon, balance: float}>
     */
    private static function rowsFrom(EloquentCollection $entries, float $startingBalance): Collection
    {
        $details = self::resolve($entries);
        $runningBalance = $startingBalance;

        return $entries->map(function (ContactLedger $entry) use (&$runningBalance, $details) {
            $runningBalance += $entry->amount;

            return [
                'id' => $entry->id,
                'type' => $entry->type,
                'amount' => $entry->amount,
                'note' => $entry->note,
                'reference_type' => $entry->reference_type,
                'reference_id' => $entry->reference_id,
                'reference_label' => $details[$entry->id]['reference_label'],
                'items' => $details[$entry->id]['items'],
                'created_at' => $entry->created_at,
                'balance' => round($runningBalance, 2),
            ];
        });
    }

    /**
     * Synthetic "Brought Forward" row (id 0, no reference/items) carrying the balance at the top of a window or page.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private static function carriedRow(float $balance, ?Carbon $at, ?string $note = null): Collection
    {
        return collect([[
            'id' => 0,
            'type' => ContactLedgerType::OpeningBalance,
            'amount' => $balance,
            'note' => $note,
            'reference_type' => null,
            'reference_id' => null,
            'reference_label' => null,
            'items' => [],
            'created_at' => $at ?? now(),
            'balance' => round($balance, 2),
        ]]);
    }

    /**
     * @param  Collection<int, ContactLedger>  $entries
     * @return array<int, array{reference_label: ?string, items: array<int, array{product: string, quantity: float, unit_price: float, subtotal: float}>}>
     */
    public static function resolve(Collection $entries): array
    {
        $idsFor = fn (string $type) => $entries->where('reference_type', $type)->pluck('reference_id')->unique()->all();

        $sales = Sale::query()->whereIn('id', $idsFor('sale'))
            ->with('items.product:id,name')->get(['id', 'invoice_no'])->keyBy('id');

        $purchases = Purchase::query()->whereIn('id', $idsFor('purchase'))
            ->with('items.product:id,name')->get(['id', 'invoice_no'])->keyBy('id');

        $saleReturns = SaleReturn::query()->whereIn('id', $idsFor('sale_return'))
            ->with(['items.product:id,name', 'sale:id,invoice_no'])->get(['id', 'sale_id'])->keyBy('id');

        $purchaseReturns = PurchaseReturn::query()->whereIn('id', $idsFor('purchase_return'))
            ->with(['items.product:id,name', 'purchase:id,invoice_no'])->get(['id', 'purchase_id'])->keyBy('id');

        $salesOrders = SalesOrder::query()->whereIn('id', $idsFor('sales_order'))
            ->with('items.product:id,name')->get(['id', 'order_no'])->keyBy('id');

        $expenses = Expense::query()->whereIn('id', $idsFor('expense'))
            ->with('category:id,name')->get(['id', 'expense_category_id'])->keyBy('id');

        $accounts = Account::query()->whereIn('id', $idsFor('account'))->get(['id', 'name'])->keyBy('id');

        return $entries->mapWithKeys(function (ContactLedger $entry) use ($sales, $purchases, $saleReturns, $purchaseReturns, $salesOrders, $expenses, $accounts) {
            $resolved = match ($entry->reference_type) {
                'sale' => self::forInvoice($sales->get($entry->reference_id)),
                'purchase' => self::forInvoice($purchases->get($entry->reference_id)),
                'sale_return' => self::forReturn($saleReturns->get($entry->reference_id), fn ($r) => $r->sale?->invoice_no),
                'purchase_return' => self::forReturn($purchaseReturns->get($entry->reference_id), fn ($r) => $r->purchase?->invoice_no),
                'sales_order' => self::forInvoice($salesOrders->get($entry->reference_id), 'order_no'),
                'expense' => ['reference_label' => $expenses->get($entry->reference_id)?->category?->name, 'items' => []],
                'account' => ['reference_label' => $accounts->get($entry->reference_id)?->name, 'items' => []],
                default => ['reference_label' => null, 'items' => []],
            };

            if (! in_array($entry->type, self::TYPES_WITH_ITEMS, true)) {
                $resolved['items'] = [];
            }

            return [$entry->id => $resolved];
        })->all();
    }

    /**
     * @param  Sale|Purchase|SalesOrder|null  $model
     * @return array{reference_label: ?string, items: array<int, array<string, mixed>>}
     */
    private static function forInvoice($model, string $numberField = 'invoice_no'): array
    {
        if ($model === null) {
            return ['reference_label' => null, 'items' => []];
        }

        return [
            'reference_label' => $model->{$numberField},
            'items' => self::mapItems($model->items),
        ];
    }

    /**
     * @param  SaleReturn|PurchaseReturn|null  $model
     * @param  callable(SaleReturn|PurchaseReturn): ?string  $parentNumber
     * @return array{reference_label: ?string, items: array<int, array<string, mixed>>}
     */
    private static function forReturn($model, callable $parentNumber): array
    {
        if ($model === null) {
            return ['reference_label' => null, 'items' => []];
        }

        return [
            'reference_label' => $parentNumber($model),
            'items' => self::mapItems($model->items),
        ];
    }

    /**
     * @param  EloquentCollection<int, Model>  $items
     * @return array<int, array{product: string, quantity: float, unit_price: float, subtotal: float}>
     */
    private static function mapItems(EloquentCollection $items): array
    {
        return $items->map(fn ($item) => [
            'product' => $item->product->name,
            'quantity' => (float) $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'subtotal' => (float) $item->subtotal,
        ])->all();
    }
}
