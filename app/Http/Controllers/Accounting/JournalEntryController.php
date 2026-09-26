<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\Settings;
use App\Queries\Accounting\JournalEntryQuery;
use App\Services\JournalService;
use Illuminate\Http\RedirectResponse;
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
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $entries = JournalEntryQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $entries->getCollection()->transform(fn (JournalEntry $entry) => [
            'id' => $entry->id,
            'entry_date' => $entry->entry_date->toDateString(),
            'description' => $entry->description,
            'reference_type' => $entry->reference_type,
            'reference_id' => $entry->reference_id,
            'status' => $entry->status,
            'total_debit' => $entry->lines->sum('debit'),
            'total_credit' => $entry->lines->sum('credit'),
            // A reversal-of-a-reversal isn't allowed — see JournalEntryShow's
            // matching guard — so the row action needs this to hide "Reverse"
            // on an entry that is itself already a reversal.
            'is_reversal' => $entry->reversal_of_id !== null,
        ]);

        return Inertia::render('accounting/journal-entries/index', [
            'entries' => $entries,
            'accounts' => ChartOfAccount::query()->orderBy('code')->get(['id', 'code', 'name']),
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'chart_of_account_id' => $validated['chart_of_account_id'] ?? null,
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function show(JournalEntry $journalEntry): Response
    {
        $journalEntry->load('lines.chartOfAccount:id,code,name', 'reversalOf:id,description');

        return Inertia::render('accounting/journal-entries/show', [
            'entry' => [
                'id' => $journalEntry->id,
                'entry_date' => $journalEntry->entry_date->toDateString(),
                'description' => $journalEntry->description,
                'reference_type' => $journalEntry->reference_type,
                'reference_id' => $journalEntry->reference_id,
                'status' => $journalEntry->status,
                'reversed_at' => $journalEntry->reversed_at?->toDateTimeString(),
                'reversal_of' => $journalEntry->reversalOf?->only(['id', 'description']),
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

    /**
     * Never edits or deletes the original — posts a mirrored correcting
     * entry and marks this one reversed.
     */
    public function reverse(Request $request, JournalEntry $journalEntry, JournalService $journal): RedirectResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        $reversal = $journal->reverse($journalEntry, $validated['reason']);

        return redirect()->route('journal-entries.show', $reversal->id);
    }
}
