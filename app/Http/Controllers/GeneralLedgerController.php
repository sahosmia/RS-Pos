<?php

namespace App\Http\Controllers;

use App\Enums\NormalBalance;
use App\Models\ChartOfAccount;
use App\Models\JournalEntryLine;
use Inertia\Inertia;
use Inertia\Response;

class GeneralLedgerController extends Controller
{
    /**
     * Every journal line posted against one Chart of Accounts row, oldest
     * first, with a running balance — the General Ledger view of a single
     * account.
     */
    public function __invoke(ChartOfAccount $chartOfAccount): Response
    {
        $runningBalance = 0.0;
        $isDebitNormal = $chartOfAccount->normal_balance === NormalBalance::Debit;

        $lines = JournalEntryLine::query()
            ->where('chart_of_account_id', $chartOfAccount->id)
            ->with('journalEntry:id,entry_date,description,reference_type,reference_id')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->orderBy('journal_entries.entry_date')
            ->orderBy('journal_entry_lines.id')
            ->select('journal_entry_lines.*')
            ->get()
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

        return Inertia::render('chart-of-accounts/ledger', [
            'account' => $chartOfAccount->only(['id', 'code', 'name', 'type', 'normal_balance', 'balance']),
            'lines' => $lines,
        ]);
    }
}
