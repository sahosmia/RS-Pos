<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\CashBook\RecordCashBookEntryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\CashBook\StoreCashBookEntryRequest;
use App\Models\CashBook;
use App\Models\CashBookEntry;
use App\Models\MiscTransactionCategory;
use App\Models\Settings;
use App\Queries\Accounting\CashBookQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashBookController extends Controller
{
    /**
     * Petty cash ledger — standalone, never part of the accounts system.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:misc_transaction_categories,id'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $categoryId = $validated['category_id'] ?? null;
        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        return Inertia::render('accounting/cash-book/index', [
            'cashBook' => CashBook::current(),
            'entries' => CashBookQuery::filtered(['category_id' => $categoryId])
                ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
                ->withQueryString(),
            'categories' => MiscTransactionCategory::query()->orderBy('name')->get(['id', 'name', 'type']),
            'filters' => [
                'category_id' => $categoryId,
                'per_page' => $resolvedPerPage ?? 'all',
            ],
            'openingBalanceSet' => CashBookEntry::query()->exists(),
        ]);
    }

    public function store(StoreCashBookEntryRequest $request, RecordCashBookEntryAction $recordEntry): RedirectResponse
    {
        $recordEntry->execute($request->validated());

        return back();
    }
}
