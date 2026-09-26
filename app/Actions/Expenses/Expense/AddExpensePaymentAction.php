<?php

namespace App\Actions\Expenses\Expense;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\Expense;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * Settles more of an expense's due — always a separate step from creating
 * it (Expense has no "confirm" step, so this is the only place cash ever
 * moves for one). Supports paying via one or more accounts.
 */
class AddExpensePaymentAction
{
    public function __construct(
        private AccountService $accounts,
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    public function execute(Expense $expense, array $payments): Expense
    {
        return DB::transaction(function () use ($expense, $payments) {
            $expense->loadMissing('contact', 'category');

            $negatedPayments = array_map(fn (array $payment) => [
                'account_id' => $payment['account_id'],
                'amount' => -abs((float) $payment['amount']),
            ], $payments);

            $paidViaAccounts = abs($this->accounts->recordSplitPayment(
                $negatedPayments,
                AccountTransactionType::Expense,
                today(),
                'expense',
                $expense->id,
            ));

            if ($expense->contact_id) {
                $this->ledger->recordContact($expense->contact, ContactLedgerType::PaymentMade, $paidViaAccounts, 'expense', $expense->id);
            }

            $this->postJournal($expense, $payments);
            $expense->recalculatePaymentTotals();

            return $expense->fresh(['category', 'contact']);
        });
    }

    /**
     * One Dr Accounts Payable / Cr {paying account} line pair per account —
     * same shape as a Purchase payment, since the due amount always sits in
     * Payable regardless of whether a contact is linked.
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function postJournal(Expense $expense, array $payments): void
    {
        $payable = $this->chartOfAccounts->code('2100');
        $lines = [];

        foreach ($payments as $payment) {
            $amount = round((float) $payment['amount'], 2);
            $account = Account::findOrFail($payment['account_id']);

            $lines[] = ['chart_of_account_id' => $payable->id, 'debit' => $amount, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount];
        }

        $this->journal->post(today(), "Payment for expense: {$expense->category->name}", $lines, 'expense', $expense->id);
    }
}
