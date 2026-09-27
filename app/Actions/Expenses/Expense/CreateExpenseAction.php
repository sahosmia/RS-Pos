<?php

namespace App\Actions\Expenses\Expense;

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Models\Expense;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Creates an expense with direct cash outflow from a single account. No due/vendor.
 */
class CreateExpenseAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{expense_category_id: int, account_id: int, total_amount: float|string, expense_date: string, note?: string|null}  $data
     */
    public function execute(array $data): Expense
    {
        return DB::transaction(function () use ($data) {
            $amount = round((float) $data['total_amount'], 2);
            $expenseDate = Carbon::parse($data['expense_date']);

            $expense = Expense::create([
                'expense_category_id' => $data['expense_category_id'],
                'contact_id' => null,
                'total_amount' => $amount,
                'expense_date' => $data['expense_date'],
                'due_date' => null,
                'note' => $data['note'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $account = Account::findOrFail($data['account_id']);

            // Record money outflow on the account
            $this->accounts->record(
                $account,
                AccountTransactionType::Expense,
                -$amount,
                $expenseDate,
                'expense',
                $expense->id,
                $data['note'] ?? null,
            );

            // Journal posting: Dr {expense category's sub-account} / Cr {paying account}
            $expense->loadMissing('category.chartOfAccount');
            $categoryAccount = $expense->category->chartOfAccount;
            $payingAccountChart = $this->chartOfAccounts->forAccount($account);

            $lines = [
                ['chart_of_account_id' => $categoryAccount->id, 'debit' => $amount, 'credit' => 0],
                ['chart_of_account_id' => $payingAccountChart->id, 'debit' => 0, 'credit' => $amount],
            ];

            $this->journal->post(
                $expenseDate,
                "Expense: {$expense->category->name}",
                $lines,
                'expense',
                $expense->id,
            );

            $expense->recalculatePaymentTotals();

            return $expense->fresh(['category']);
        });
    }
}
