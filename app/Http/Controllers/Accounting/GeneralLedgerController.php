<?php

namespace App\Http\Controllers\Accounting;

use App\Enums\NormalBalance;
use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Models\JournalEntryLine;
use App\Support\LedgerPage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GeneralLedgerController extends Controller
{
    /**
     * Journal lines posted against one Chart of Accounts row, oldest first,
     * with a running balance — the General Ledger view of a single account.
     * Paged (opening on the newest page) and optionally limited to a date
     * range, so an account with years of lines never loads in one go; each
     * page's balance continues from everything before it.
     */
    public function __invoke(Request $request, ChartOfAccount $chartOfAccount): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $isDebitNormal = $chartOfAccount->normal_balance === NormalBalance::Debit;
        $signed = $isDebitNormal
            ? 'journal_entry_lines.debit - journal_entry_lines.credit'
            : 'journal_entry_lines.credit - journal_entry_lines.debit';

        $account = fn () => JournalEntryLine::query()
            ->where('chart_of_account_id', $chartOfAccount->id)
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id');

        $broughtForward = isset($validated['from'])
            ? (float) $account()->where('journal_entries.entry_date', '<', $validated['from'])->sum(DB::raw($signed))
            : 0.0;

        $query = $account()
            ->when($validated['from'] ?? null, fn ($q, string $from) => $q->where('journal_entries.entry_date', '>=', $from))
            ->when($validated['to'] ?? null, fn ($q, string $to) => $q->where('journal_entries.entry_date', '<=', $to))
            ->orderBy('journal_entries.entry_date')
            ->orderBy('journal_entry_lines.id')
            ->select('journal_entry_lines.*');

        $page = LedgerPage::of($query, $signed, $broughtForward, $validated['page'] ?? null);

        $runningBalance = $page['openingBalance'];
        $lines = $page['rows']->load('journalEntry:id,entry_date,description,reference_type,reference_id')
            ->map(function (JournalEntryLine $line) use (&$runningBalance, $isDebitNormal) {
                $netDebit = $line->debit - $line->credit;
                $runningBalance += $isDebitNormal ? $netDebit : -$netDebit;

                return [
                    'id' => $line->id,
                    'entry_date' => $line->journalEntry->entry_date->toDateString(),
                    'description' => $line->journalEntry->description,
                    'reference_type' => $line->journalEntry->reference_type,
                    'reference_id' => $line->journalEntry->reference_id,
                    'journal_entry_id' => $line->journalEntry->id,
                    'debit' => $line->debit,
                    'credit' => $line->credit,
                    'note' => $line->note,
                    'balance' => round($runningBalance, 2),
                ];
            });

        return Inertia::render('accounting/chart-of-accounts/ledger', [
            'account' => $chartOfAccount->only(['id', 'code', 'name', 'type', 'normal_balance', 'balance']),
            'lines' => $lines,
            'openingBalance' => round($page['openingBalance'], 2),
            'pagination' => $page['pagination'],
            'filters' => ['from' => $validated['from'] ?? '', 'to' => $validated['to'] ?? ''],
        ]);
    }
}
