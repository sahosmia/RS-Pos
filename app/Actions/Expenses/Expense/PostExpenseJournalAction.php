<?php

namespace App\Actions\Expenses\Expense;

use App\Models\Expense;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;

/**
 * Dr {the expense category's sub-account} / Cr Accounts Payable for the
 * full total_amount — shared by CreateExpenseAction and UpdateExpenseAction
 * so both post the exact same shape, whether this is the first posting or a
 * pre-payment correction.
 */
class PostExpenseJournalAction
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    public function execute(Expense $expense): void
    {
        $expense->loadMissing('category.chartOfAccount');

        $categoryAccount = $expense->category->chartOfAccount;
        $payable = $this->chartOfAccounts->code('2100');

        $lines = [
            ['chart_of_account_id' => $categoryAccount->id, 'debit' => $expense->total_amount, 'credit' => 0],
            ['chart_of_account_id' => $payable->id, 'debit' => 0, 'credit' => $expense->total_amount],
        ];

        $this->journal->post(
            $expense->expense_date,
            "Expense: {$expense->category->name}",
            $lines,
            'expense',
            $expense->id,
        );
    }
}
