<?php

namespace App\Http\Controllers;

use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JournalEntryController extends Controller
{
    /**
     * Every posted entry — filter by date range or a specific account.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'chart_of_account_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
        ]);

        $entries = JournalEntry::query()
            ->with('lines.chartOfAccount:id,code,name')
            ->when($validated['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('entry_date', '>=', $from))
            ->when($validated['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('entry_date', '<=', $to))
            ->when(
                $validated['chart_of_account_id'] ?? null,
                fn (Builder $query, int $id) => $query->whereHas('lines', fn (Builder $lines) => $lines->where('chart_of_account_id', $id)),
            )
            ->orderByDesc('entry_date')
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString();

        $entries->getCollection()->transform(fn (JournalEntry $entry) => [
            'id' => $entry->id,
            'entry_date' => $entry->entry_date->toDateString(),
            'description' => $entry->description,
            'reference_type' => $entry->reference_type,
            'reference_id' => $entry->reference_id,
            'total_debit' => $entry->lines->sum('debit'),
            'total_credit' => $entry->lines->sum('credit'),
        ]);

        return Inertia::render('journal-entries/index', [
            'entries' => $entries,
            'accounts' => ChartOfAccount::query()->orderBy('code')->get(['id', 'code', 'name']),
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'chart_of_account_id' => $validated['chart_of_account_id'] ?? null,
            ],
        ]);
    }

    public function show(JournalEntry $journalEntry): Response
    {
        $journalEntry->load('lines.chartOfAccount:id,code,name');

        return Inertia::render('journal-entries/show', [
            'entry' => [
                'id' => $journalEntry->id,
                'entry_date' => $journalEntry->entry_date->toDateString(),
                'description' => $journalEntry->description,
                'reference_type' => $journalEntry->reference_type,
                'reference_id' => $journalEntry->reference_id,
                'lines' => $journalEntry->lines->map(fn ($line) => [
                    'id' => $line->id,
                    'chart_of_account' => $line->chartOfAccount->only(['id', 'code', 'name']),
                    'debit' => $line->debit,
                    'credit' => $line->credit,
                    'note' => $line->note,
                ]),
            ],
        ]);
    }
}
