<?php

namespace App\Actions\Expenses\Expense;

use App\Models\Expense;
use Illuminate\Support\Facades\DB;

/**
 * Corrects an expense the way the rest of the app does — never by editing history: the old money
 * movement and journal entry are reversed, then the corrected amount/category/account/date is
 * posted fresh.
 */
class UpdateExpenseAction
{
    public function __construct(
        private ReverseExpenseAction $reverse,
        private PostExpenseAction $post,
    ) {}

    /**
     * @param  array{expense_category_id: int|string, account_id: int|string, total_amount: float|string, expense_date: string, note?: string|null}  $data
     */
    public function execute(Expense $expense, array $data): Expense
    {
        return DB::transaction(function () use ($expense, $data) {
            $this->reverse->execute($expense, 'Expense corrected');

            $expense->update([
                'expense_category_id' => $data['expense_category_id'],
                'account_id' => $data['account_id'],
                'total_amount' => round((float) $data['total_amount'], 2),
                'expense_date' => $data['expense_date'],
                'note' => $data['note'] ?? null,
            ]);

            $this->post->execute($expense->fresh());

            return $expense->fresh(['category', 'account']);
        });
    }
}
