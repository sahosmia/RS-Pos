<?php

namespace App\Actions\OtherLiability;

use App\Enums\AccountTransactionType;
use App\Enums\OtherLiabilityTransactionType;
use App\Models\Account;
use App\Models\OtherLiability;
use App\Models\OtherLiabilityTransaction;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AddOtherLiabilityTransactionAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{type: string, amount: float|string, account_id?: int|string|null, note?: string|null}  $data
     */
    public function execute(OtherLiability $liability, array $data): OtherLiabilityTransaction
    {
        $type = OtherLiabilityTransactionType::from($data['type']);
        $amount = round((float) $data['amount'], 2);
        $note = $data['note'] ?? null;

        return DB::transaction(fn () => match ($type) {
            OtherLiabilityTransactionType::Increase => $this->recordIncrease($liability, $amount, $data, $note),
            OtherLiabilityTransactionType::Payment => $this->recordPayment($liability, $amount, $data, $note),
            OtherLiabilityTransactionType::Adjustment => $this->recordAdjustment($liability, $amount, $note),
            OtherLiabilityTransactionType::OpeningLiability => throw new InvalidArgumentException('Opening balance is set when the liability is created, not added later.'),
        });
    }

    private function recordIncrease(OtherLiability $liability, float $amount, array $data, ?string $note): OtherLiabilityTransaction
    {
        $account = Account::findOrFail($data['account_id']);
        $transaction = $liability->addLedgerTransaction(OtherLiabilityTransactionType::Increase->value, $amount, $account->id, $note);

        $this->accounts->record($account, AccountTransactionType::Adjustment, $amount, today(), 'other_liability', $liability->id, $note);

        $liabilityAccount = $this->chartOfAccounts->code('2300');
        $this->journal->post(today(), "Liability increase: {$liability->name}", [
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $liabilityAccount->id, 'debit' => 0, 'credit' => $amount],
        ], 'other_liability', $liability->id);

        return $transaction;
    }

    private function recordPayment(OtherLiability $liability, float $amount, array $data, ?string $note): OtherLiabilityTransaction
    {
        $account = Account::findOrFail($data['account_id']);
        $transaction = $liability->addLedgerTransaction(OtherLiabilityTransactionType::Payment->value, -$amount, $account->id, $note);

        $this->accounts->record($account, AccountTransactionType::Adjustment, -$amount, today(), 'other_liability', $liability->id, $note);

        $liabilityAccount = $this->chartOfAccounts->code('2300');
        $this->journal->post(today(), "Liability payment: {$liability->name}", [
            ['chart_of_account_id' => $liabilityAccount->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount],
        ], 'other_liability', $liability->id);

        return $transaction;
    }

    /**
     * A situational correction with no standard business meaning — posted
     * against Opening Balance Equity, same as any other balance correction
     * with no natural counterpart account.
     */
    private function recordAdjustment(OtherLiability $liability, float $amount, ?string $note): OtherLiabilityTransaction
    {
        $transaction = $liability->addLedgerTransaction(OtherLiabilityTransactionType::Adjustment->value, $amount, null, $note);

        $this->journal->postOpeningBalance(
            today(),
            $this->chartOfAccounts->code('2300'),
            $this->chartOfAccounts->code('3300'),
            -$amount,
            'other_liability_adjustment',
            $liability->id,
            "Liability balance adjustment: {$liability->name}",
        );

        return $transaction;
    }
}
