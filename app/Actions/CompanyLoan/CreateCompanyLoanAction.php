<?php

namespace App\Actions\CompanyLoan;

use App\Enums\LoanTransactionType;
use App\Models\CompanyLoan;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateCompanyLoanAction
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
        private AddLoanTransactionAction $addTransaction,
    ) {}

    /**
     * One step, never create-then-disburse:
     *  - `existing`: a loan already running before the system. Only what is still owed
     *    (`current_balance`) is brought in, as an opening balance — no cash account moves.
     *  - `new`: money received today. Recorded as a disbursement, so the chosen account
     *    is credited and Loans Payable grows.
     *
     * `loan_amount` stays the original agreed amount for reference in both cases.
     *
     * @param  array{loan_type: string, lender_name: string, loan_amount: float|string, current_balance?: float|string|null, account_id?: int|string|null, interest_rate?: float|string|null, start_date: string}  $data
     */
    public function execute(array $data): CompanyLoan
    {
        return DB::transaction(function () use ($data) {
            $loan = CompanyLoan::create([
                'lender_name' => $data['lender_name'],
                'loan_amount' => $data['loan_amount'],
                'interest_rate' => $data['interest_rate'] ?? null,
                'start_date' => $data['start_date'],
                'created_by' => Auth::id(),
            ]);

            if ($data['loan_type'] === 'new') {
                $this->addTransaction->execute($loan, [
                    'type' => LoanTransactionType::Disbursement->value,
                    'amount' => $data['loan_amount'],
                    'account_id' => $data['account_id'],
                    'note' => 'New loan',
                ]);

                return $loan->fresh();
            }

            $balance = round((float) $data['current_balance'], 2);

            $loan->addLedgerTransaction(LoanTransactionType::OpeningLoan->value, $balance, null, 'Existing loan — opening balance');

            // Negative — liability-side of postOpeningBalance (Dr Opening Balance Equity / Cr Loans Payable).
            $this->journal->postOpeningBalance(
                today(),
                $this->chartOfAccounts->code('2200'),
                $this->chartOfAccounts->code('3300'),
                -$balance,
                'company_loan_opening',
                $loan->id,
                "Opening loan: {$loan->lender_name}",
            );

            return $loan->fresh();
        });
    }
}
