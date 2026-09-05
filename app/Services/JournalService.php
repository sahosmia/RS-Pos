<?php

namespace App\Services;

use App\Enums\JournalEntryStatus;
use App\Enums\NormalBalance;
use App\Exceptions\AlreadyReversedException;
use App\Exceptions\ClosedPeriodException;
use App\Exceptions\UnbalancedJournalEntryException;
use App\Models\AccountingPeriod;
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
     * @throws ClosedPeriodException
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

        $this->assertPeriodOpen($date);

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

    /**
     * The one entry every opening balance posts against — Dr {subject} / Cr
     * Opening Balance Equity when $amount is positive (asset-side: Cash,
     * Inventory, Fixed Asset, Customer Due, Staff Advance), or the mirror
     * when negative (liability-side: Supplier Due, Loan, Other Liability).
     *
     * @throws UnbalancedJournalEntryException
     * @throws ClosedPeriodException
     */
    public function postOpeningBalance(
        CarbonInterface $date,
        ChartOfAccount $subject,
        ChartOfAccount $equity,
        float $amount,
        string $referenceType,
        int $referenceId,
        string $description,
    ): JournalEntry {
        $magnitude = abs(round($amount, 2));

        $lines = $amount > 0
            ? [
                ['chart_of_account_id' => $subject->id, 'debit' => $magnitude, 'credit' => 0],
                ['chart_of_account_id' => $equity->id, 'debit' => 0, 'credit' => $magnitude],
            ]
            : [
                ['chart_of_account_id' => $equity->id, 'debit' => $magnitude, 'credit' => 0],
                ['chart_of_account_id' => $subject->id, 'debit' => 0, 'credit' => $magnitude],
            ];

        return $this->post($date, $description, $lines, $referenceType, $referenceId);
    }

    /**
     * Corrects a mistake without ever editing or deleting history: posts a
     * new entry with every line's debit/credit swapped, then marks the
     * original Reversed. The reversal itself is always allowed through
     * today's date even if the original's period has since closed.
     *
     * @throws AlreadyReversedException
     */
    public function reverse(JournalEntry $original, string $reason, ?int $userId = null): JournalEntry
    {
        if ($original->status === JournalEntryStatus::Reversed) {
            throw new AlreadyReversedException($original->id);
        }

        $original->loadMissing('lines');

        $mirroredLines = $original->lines->map(fn ($line) => [
            'chart_of_account_id' => $line->chart_of_account_id,
            'debit' => $line->credit,
            'credit' => $line->debit,
        ])->all();

        return DB::transaction(function () use ($original, $reason, $userId, $mirroredLines) {
            $reversal = $this->post(now(), "Reversal: {$reason}", $mirroredLines, 'journal_reversal', $original->id);

            $original->update([
                'status' => 'reversed',
                'reversed_at' => now(),
                'reversed_by' => $userId ?? Auth::id(),
            ]);

            $reversal->update(['reversal_of_id' => $original->id]);

            return $reversal;
        });
    }

    /**
     * @throws ClosedPeriodException
     */
    private function assertPeriodOpen(CarbonInterface $date): void
    {
        $period = AccountingPeriod::query()->containing($date)->first();

        // No period record covers this date (e.g. outside the seeded fiscal
        // year) — nothing to enforce, so posting is allowed.
        if ($period === null) {
            return;
        }

        if (! $period->isOpen()) {
            throw new ClosedPeriodException($date);
        }
    }
}
