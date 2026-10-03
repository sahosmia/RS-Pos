<?php

namespace App\Actions\OtherIncome;

use App\Enums\AccountTransactionType;
use App\Enums\JournalEntryStatus;
use App\Models\JournalEntry;
use App\Models\OtherIncome;
use App\Services\AccountService;
use App\Services\JournalService;
use Illuminate\Support\Facades\DB;

class DeleteOtherIncomeAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
    ) {}

    /**
     * History is never edited: the account movement is undone with an opposite entry, the journal
     * entry is reversed (not deleted), and only then is the income row itself removed.
     */
    public function execute(OtherIncome $income): void
    {
        DB::transaction(function () use ($income) {
            $income->loadMissing('account', 'category');

            $this->accounts->record(
                $income->account,
                AccountTransactionType::OtherIncome,
                -$income->amount,
                today(),
                'other_income',
                $income->id,
                'Reversal: deleted other income',
            );

            JournalEntry::query()
                ->where('reference_type', 'other_income')
                ->where('reference_id', $income->id)
                ->where('status', JournalEntryStatus::Posted->value)
                ->get()
                ->each(fn (JournalEntry $entry) => $this->journal->reverse($entry, "Other income deleted: {$income->category->name}"));

            $income->delete();
        });
    }
}
