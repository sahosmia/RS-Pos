<?php

namespace App\Actions\Expenses\Expense;

use App\Enums\ContactLedgerType;
use App\Enums\JournalEntryStatus;
use App\Models\Expense;
use App\Models\JournalEntry;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * Only reachable while Expense::canEdit() is true (nothing paid yet, see
 * that method) — at that point the only footprint so far is one posted
 * journal entry and, if a contact was set, one contact_ledger entry.
 * Neither is ever edited in place: the old journal entry is reversed and a
 * fresh one posted for the corrected amount/category, and the old ledger
 * contribution is cancelled with an offsetting entry before the new one (if
 * any) is recorded — same "never edit/delete, always append a correcting
 * entry" rule the rest of the app follows.
 */
class UpdateExpenseAction
{
    public function __construct(
        private LedgerService $ledger,
        private JournalService $journal,
        private PostExpenseJournalAction $postJournal,
    ) {}

    /**
     * @param  array{expense_category_id: int, contact_id?: int|null, total_amount: float|string, expense_date: string, due_date?: string|null, note?: string|null}  $data
     */
    public function execute(Expense $expense, array $data): Expense
    {
        return DB::transaction(function () use ($expense, $data) {
            $expense->loadMissing('contact');

            if ($expense->contact_id) {
                $this->ledger->recordContact($expense->contact, ContactLedgerType::Adjustment, $expense->total_amount, 'expense', $expense->id, 'Expense corrected');
            }

            $original = JournalEntry::query()
                ->where('reference_type', 'expense')
                ->where('reference_id', $expense->id)
                ->where('status', JournalEntryStatus::Posted)
                ->first();

            if ($original !== null) {
                $this->journal->reverse($original, 'Expense corrected');
            }

            $expense->update([
                'expense_category_id' => $data['expense_category_id'],
                'contact_id' => $data['contact_id'] ?? null,
                'total_amount' => round((float) $data['total_amount'], 2),
                'expense_date' => $data['expense_date'],
                'due_date' => $data['due_date'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

            if ($expense->contact_id) {
                // contact_id may have just changed above — force a reload,
                // loadMissing would keep the stale (old-contact) relation.
                $expense->load('contact');
                $this->ledger->recordContact($expense->contact, ContactLedgerType::ExpenseDue, -$expense->total_amount, 'expense', $expense->id);
            }

            $this->postJournal->execute($expense);
            $expense->recalculatePaymentTotals();

            return $expense->fresh(['category', 'contact']);
        });
    }
}
