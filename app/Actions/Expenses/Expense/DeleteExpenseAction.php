<?php

namespace App\Actions\Expenses\Expense;

use App\Models\Expense;
use Illuminate\Support\Facades\DB;

class DeleteExpenseAction
{
    public function __construct(
        private ReverseExpenseAction $reverse,
    ) {}

    /**
     * The money goes back to the account and the journal is reversed; only then is the row removed.
     */
    public function execute(Expense $expense): void
    {
        DB::transaction(function () use ($expense) {
            $this->reverse->execute($expense, 'Expense deleted');

            $expense->delete();
        });
    }
}
