<?php

namespace App\Actions\Expenses\Expense;

use App\Models\Expense;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * An expense is paid in full the moment it is recorded: it is created and its money side
 * (account paid out, journal booked) is posted together — see {@see PostExpenseAction}.
 */
class CreateExpenseAction
{
    public function __construct(
        private PostExpenseAction $post,
    ) {}

    /**
     * @param  array{expense_category_id: int|string, account_id: int|string, total_amount: float|string, expense_date: string, note?: string|null}  $data
     */
    public function execute(array $data): Expense
    {
        return DB::transaction(function () use ($data) {
            $expense = Expense::create([
                'expense_category_id' => $data['expense_category_id'],
                'account_id' => $data['account_id'],
                'total_amount' => round((float) $data['total_amount'], 2),
                'expense_date' => $data['expense_date'],
                'note' => $data['note'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $this->post->execute($expense);

            return $expense->fresh(['category', 'account']);
        });
    }
}
