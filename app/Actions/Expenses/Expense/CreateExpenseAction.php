<?php

namespace App\Actions\Expenses\Expense;

use App\Enums\ContactLedgerType;
use App\Models\Expense;
use App\Services\LedgerService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Creates an expense as a pure accrual — Dr {category}/Cr Accounts Payable,
 * via {@see PostExpenseJournalAction} (same shape {@see UpdateExpenseAction}
 * posts on a correction). No cash moves here; that's always a separate step
 * through {@see AddExpensePaymentAction}, same as a Purchase's confirm vs.
 * pay-due split.
 */
class CreateExpenseAction
{
    public function __construct(
        private LedgerService $ledger,
        private PostExpenseJournalAction $postJournal,
    ) {}

    /**
     * @param  array{expense_category_id: int, contact_id?: int|null, total_amount: float|string, expense_date: string, due_date?: string|null, note?: string|null}  $data
     */
    public function execute(array $data): Expense
    {
        return DB::transaction(function () use ($data) {
            $expense = Expense::create([
                'expense_category_id' => $data['expense_category_id'],
                'contact_id' => $data['contact_id'] ?? null,
                'total_amount' => round((float) $data['total_amount'], 2),
                'expense_date' => $data['expense_date'],
                'due_date' => $data['due_date'] ?? null,
                'note' => $data['note'] ?? null,
                'created_by' => Auth::id(),
            ]);

            if ($expense->contact_id) {
                $expense->loadMissing('contact');
                $this->ledger->recordContact($expense->contact, ContactLedgerType::ExpenseDue, -$expense->total_amount, 'expense', $expense->id);
            }

            $this->postJournal->execute($expense);
            $expense->recalculatePaymentTotals();

            return $expense->fresh(['category', 'contact']);
        });
    }
}
