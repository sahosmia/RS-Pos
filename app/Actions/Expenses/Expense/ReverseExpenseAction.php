<?php

namespace App\Actions\Expenses\Expense;

use App\Enums\AccountTransactionType;
use App\Enums\JournalEntryStatus;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\Expense;
use App\Models\JournalEntry;
use App\Services\AccountService;
use App\Services\JournalService;

/**
 * Undoes an expense's money side without erasing history: each account gets back whatever this
 * expense net-took from it (through an opposite entry) and every still-posted journal entry is
 * reversed — nothing is edited or deleted.
 *
 * Working from the account transactions' net per account (rather than `expense.account_id`) means it
 * is correct after earlier corrections, and for expenses recorded under the old pay-later model.
 */
class ReverseExpenseAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
    ) {}

    public function execute(Expense $expense, string $reason): void
    {
        AccountTransaction::query()
            ->where('reference_type', 'expense')
            ->where('reference_id', $expense->id)
            ->get()
            ->groupBy('account_id')
            ->each(function ($transactions, $accountId) use ($expense, $reason) {
                $net = round((float) $transactions->sum('amount'), 2);

                if ($net === 0.0) {
                    return;
                }

                $this->accounts->record(
                    Account::findOrFail($accountId),
                    AccountTransactionType::Expense,
                    -$net,
                    today(),
                    'expense',
                    $expense->id,
                    "Reversal: {$reason}",
                );
            });

        JournalEntry::query()
            ->where('reference_type', 'expense')
            ->where('reference_id', $expense->id)
            ->where('status', JournalEntryStatus::Posted->value)
            ->get()
            ->each(fn (JournalEntry $entry) => $this->journal->reverse($entry, $reason));
    }
}
