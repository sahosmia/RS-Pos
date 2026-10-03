<?php

namespace App\Actions\Expenses\Expense;

use App\Enums\AccountTransactionType;
use App\Models\Expense;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;

/**
 * The money side of an expense, shared by create and edit: the account is paid out in full and the
 * journal books Dr {category's sub-account} / Cr {the account}.
 */
class PostExpenseAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    public function execute(Expense $expense): void
    {
        $expense->loadMissing('category.chartOfAccount', 'account');

        $this->accounts->record(
            $expense->account,
            AccountTransactionType::Expense,
            -$expense->total_amount,
            $expense->expense_date,
            'expense',
            $expense->id,
            $expense->note,
        );

        $this->journal->post($expense->expense_date, "Expense: {$expense->category->name}", [
            ['chart_of_account_id' => $expense->category->chartOfAccount->id, 'debit' => $expense->total_amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($expense->account)->id, 'debit' => 0, 'credit' => $expense->total_amount],
        ], 'expense', $expense->id);
    }
}
