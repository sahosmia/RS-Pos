<?php

namespace App\Http\Controllers;

use App\Actions\CashBook\RecordCashBookEntryAction;
use App\Http\Requests\CashBook\StoreCashBookEntryRequest;
use App\Models\CashBook;
use App\Models\CashBookEntry;
use App\Models\MiscTransactionCategory;
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
        ]);

        $categoryId = $validated['category_id'] ?? null;

        return Inertia::render('cash-book/index', [
            'cashBook' => CashBook::current(),
            'entries' => CashBookEntry::query()
                ->with('category:id,name,type')
                ->when($categoryId, fn ($query, $id) => $query->where('category_id', $id))
                ->orderByDesc('entry_date')
                ->orderByDesc('id')
                ->paginate(25)
                ->withQueryString(),
            'categories' => MiscTransactionCategory::query()->orderBy('name')->get(['id', 'name', 'type']),
            'filters' => ['category_id' => $categoryId],
            'openingBalanceSet' => CashBookEntry::query()->exists(),
        ]);
    }

    public function store(StoreCashBookEntryRequest $request, RecordCashBookEntryAction $recordEntry): RedirectResponse
    {
        $recordEntry->execute($request->validated());

        return back();
    }
}
