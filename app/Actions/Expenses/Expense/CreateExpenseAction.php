<?php

namespace App\Actions\Expenses\Expense;

use App\Enums\ContactLedgerType;
use App\Models\Expense;
use App\Services\LedgerService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Records a due bill — no payment here (that's AddExpensePaymentAction,
 * separately, one or more times later). Same due/partial/paid shape as
 * Purchase, minus the receiving/stock step Purchase has and Expense doesn't.
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
