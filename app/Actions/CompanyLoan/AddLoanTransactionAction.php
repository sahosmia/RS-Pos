<?php

namespace App\Actions\CompanyLoan;

use App\Enums\AccountTransactionType;
use App\Enums\LoanTransactionType;
use App\Models\Account;
use App\Models\CompanyLoan;
use App\Models\LoanTransaction;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AddLoanTransactionAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{type: string, amount: float|string, account_id?: int|string|null, note?: string|null}  $data
     */
    public function execute(CompanyLoan $loan, array $data): LoanTransaction
    {
        $type = LoanTransactionType::from($data['type']);
        $amount = round((float) $data['amount'], 2);
        $note = $data['note'] ?? null;

        return DB::transaction(function () use ($loan, $type, $amount, $data, $note) {
            $loan = CompanyLoan::where('id', $loan->id)->lockForUpdate()->firstOrFail();

            return match ($type) {
                LoanTransactionType::Disbursement => $this->recordDisbursement($loan, $amount, $data, $note),
                LoanTransactionType::Repayment => $this->recordRepayment($loan, $amount, $data, $note),
                LoanTransactionType::InterestCharge => $this->recordInterest($loan, $amount, $note),
                LoanTransactionType::Adjustment => $this->recordAdjustment($loan, $amount, $note),
            };
        });
    }

    private function recordDisbursement(CompanyLoan $loan, float $amount, array $data, ?string $note): LoanTransaction
    {
        $account = Account::findOrFail($data['account_id']);
        $transaction = $loan->addLedgerTransaction(LoanTransactionType::Disbursement->value, $amount, $account->id, $note);

        $this->accounts->record($account, AccountTransactionType::LoanReceived, $amount, today(), 'company_loan', $loan->id, $note);

        $payable = $this->chartOfAccounts->code('2200');
        $this->journal->post(today(), "Loan disbursement: {$loan->lender_name}", [
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $payable->id, 'debit' => 0, 'credit' => $amount],
        ], 'company_loan', $loan->id);

        return $transaction;
    }

    private function recordRepayment(CompanyLoan $loan, float $amount, array $data, ?string $note): LoanTransaction
    {
        if ($amount > ($loan->outstanding_balance + 0.0001)) {
            throw ValidationException::withMessages([
                'amount' => ['Repayment amount cannot exceed outstanding loan balance (৳'.number_format($loan->outstanding_balance, 2).').'],
            ]);
        }

        $account = Account::findOrFail($data['account_id']);
        $transaction = $loan->addLedgerTransaction(LoanTransactionType::Repayment->value, -$amount, $account->id, $note);

        $this->accounts->record($account, AccountTransactionType::LoanRepayment, -$amount, today(), 'company_loan', $loan->id, $note);

        $payable = $this->chartOfAccounts->code('2200');
        $this->journal->post(today(), "Loan repayment: {$loan->lender_name}", [
            ['chart_of_account_id' => $payable->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount],
        ], 'company_loan', $loan->id);

        return $transaction;
    }

    /**
     * Pure accrual — no cash moves, no account_transactions row.
     */
    private function recordInterest(CompanyLoan $loan, float $amount, ?string $note): LoanTransaction
    {
        $transaction = $loan->addLedgerTransaction(LoanTransactionType::InterestCharge->value, $amount, null, $note);

        $interestExpense = $this->chartOfAccounts->code('5900');
        $payable = $this->chartOfAccounts->code('2200');
        $this->journal->post(today(), "Interest charge: {$loan->lender_name}", [
            ['chart_of_account_id' => $interestExpense->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $payable->id, 'debit' => 0, 'credit' => $amount],
        ], 'company_loan', $loan->id);

        return $transaction;
    }

    /**
     * A situational correction with no standard business meaning — posted
     * against Opening Balance Equity, same as any other balance correction
     * with no natural counterpart account.
     */
    private function recordAdjustment(CompanyLoan $loan, float $amount, ?string $note): LoanTransaction
    {
        $transaction = $loan->addLedgerTransaction(LoanTransactionType::Adjustment->value, $amount, null, $note);

        $this->journal->postOpeningBalance(
            today(),
            $this->chartOfAccounts->code('2200'),
            $this->chartOfAccounts->code('3300'),
            -$amount,
            'company_loan_adjustment',
            $loan->id,
            "Loan balance adjustment: {$loan->lender_name}",
        );

        return $transaction;
    }
}
