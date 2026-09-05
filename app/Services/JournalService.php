<?php

namespace App\Services;

use App\Enums\NormalBalance;
use App\Exceptions\UnbalancedJournalEntryException;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Every Journal Entry — the General Ledger — goes through here. Sits above
 * the subsidiary ledgers (contact_ledger, account_transactions,
 * stock_movements...), which stay exactly as they were; this is a parallel
 * write inside the same transaction, not a replacement.
 */
class JournalService
{
    /**
     * @param  array<int, array{chart_of_account_id: int, debit?: float|string, credit?: float|string, note?: string|null}>  $lines
     *
     * @throws UnbalancedJournalEntryException
     */
    public function post(
        CarbonInterface $date,
        string $description,
        array $lines,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): JournalEntry {
        $totalDebit = round(array_sum(array_map(fn (array $line) => (float) ($line['debit'] ?? 0), $lines)), 2);
        $totalCredit = round(array_sum(array_map(fn (array $line) => (float) ($line['credit'] ?? 0), $lines)), 2);

        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new UnbalancedJournalEntryException($totalDebit, $totalCredit);
        }

        return DB::transaction(function () use ($date, $description, $lines, $referenceType, $referenceId) {
            $entry = JournalEntry::create([
                'entry_date' => $date,
                'description' => $description,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'created_by' => Auth::id(),
            ]);

            foreach ($lines as $line) {
                $debit = round((float) ($line['debit'] ?? 0), 2);
                $credit = round((float) ($line['credit'] ?? 0), 2);

                $account = ChartOfAccount::findOrFail($line['chart_of_account_id']);

                $entry->lines()->create([
                    'chart_of_account_id' => $account->id,
                    'debit' => $debit,
                    'credit' => $credit,
                    'note' => $line['note'] ?? null,
                ]);

                // Debit-normal accounts (asset/expense) grow with debit; credit-normal
                // accounts (liability/equity/income) grow with credit.
                $netDebit = $debit - $credit;
                $delta = $account->normal_balance === NormalBalance::Debit ? $netDebit : -$netDebit;

                $account->increment('balance', $delta);
            }

            return $entry->load('lines.chartOfAccount');
        });
    }
}
