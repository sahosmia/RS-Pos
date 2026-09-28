<?php

namespace App\Actions\Investor;

use App\Enums\AccountTransactionType;
use App\Enums\InvestorTransactionType;
use App\Models\Account;
use App\Models\Investor;
use App\Models\InvestorTransaction;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AddInvestorTransactionAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{type: string, amount: float|string, account_id?: int|string|null, note?: string|null}  $data
     */
    public function execute(Investor $investor, array $data): InvestorTransaction
    {
        $type = InvestorTransactionType::from($data['type']);
        $amount = round((float) $data['amount'], 2);
        $note = $data['note'] ?? null;

        return DB::transaction(function () use ($investor, $type, $amount, $data, $note) {
            $investor = Investor::where('id', $investor->id)->lockForUpdate()->firstOrFail();

            return match ($type) {
                InvestorTransactionType::Investment => $this->recordInvestment($investor, $amount, $data, $note),
                InvestorTransactionType::ProfitShare => $this->recordProfitShare($investor, $amount, $data, $note),
                InvestorTransactionType::Withdrawal => $this->recordWithdrawal($investor, $amount, $data, $note),
                InvestorTransactionType::Adjustment => $this->recordAdjustment($investor, $amount, $note),
            };
        });
    }

    private function recordInvestment(Investor $investor, float $amount, array $data, ?string $note): InvestorTransaction
    {
        $account = Account::findOrFail($data['account_id']);
        $transaction = $investor->addLedgerTransaction(InvestorTransactionType::Investment->value, $amount, $account->id, $note);

        $this->accounts->record($account, AccountTransactionType::InvestmentReceived, $amount, today(), 'investor', $investor->id, $note);

        $capital = $this->chartOfAccounts->code('3100');
        $this->journal->post(today(), "Investment received: {$investor->name}", [
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $capital->id, 'debit' => 0, 'credit' => $amount],
        ], 'investor', $investor->id);

        return $transaction;
    }

    /**
     * total_invested stays untouched — only cash leaves, against Retained
     * Earnings (the profit being distributed), not the capital account.
     */
    private function recordProfitShare(Investor $investor, float $amount, array $data, ?string $note): InvestorTransaction
    {
        $account = Account::findOrFail($data['account_id']);
        $transaction = $investor->addLedgerTransaction(InvestorTransactionType::ProfitShare->value, 0, $account->id, $note);

        $this->accounts->record($account, AccountTransactionType::ProfitDistribution, -$amount, today(), 'investor', $investor->id, $note);

        $retainedEarnings = $this->chartOfAccounts->code('3200');
        $this->journal->post(today(), "Profit share paid: {$investor->name}", [
            ['chart_of_account_id' => $retainedEarnings->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount],
        ], 'investor', $investor->id);

        return $transaction;
    }

    private function recordWithdrawal(Investor $investor, float $amount, array $data, ?string $note): InvestorTransaction
    {
        if ($amount > ($investor->total_invested + 0.0001)) {
            throw ValidationException::withMessages([
                'amount' => ['Cannot withdraw more than total invested balance (৳'.number_format($investor->total_invested, 2).').'],
            ]);
        }

        $account = Account::findOrFail($data['account_id']);
        $transaction = $investor->addLedgerTransaction(InvestorTransactionType::Withdrawal->value, -$amount, $account->id, $note);

        $this->accounts->record($account, AccountTransactionType::InvestorWithdrawal, -$amount, today(), 'investor', $investor->id, $note);

        $capital = $this->chartOfAccounts->code('3100');
        $this->journal->post(today(), "Capital withdrawal: {$investor->name}", [
            ['chart_of_account_id' => $capital->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount],
        ], 'investor', $investor->id);

        return $transaction;
    }

    /**
     * A situational correction with no standard business meaning — posted
     * against Opening Balance Equity, same as any other balance correction
     * with no natural counterpart account.
     */
    private function recordAdjustment(Investor $investor, float $amount, ?string $note): InvestorTransaction
    {
        $transaction = $investor->addLedgerTransaction(InvestorTransactionType::Adjustment->value, $amount, null, $note);

        $this->journal->postOpeningBalance(
            today(),
            $this->chartOfAccounts->code('3100'),
            $this->chartOfAccounts->code('3300'),
            -$amount,
            'investor_adjustment',
            $investor->id,
            "Investor balance adjustment: {$investor->name}",
        );

        return $transaction;
    }
}
