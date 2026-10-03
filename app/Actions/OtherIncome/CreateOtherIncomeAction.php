<?php

namespace App\Actions\OtherIncome;

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Models\OtherIncome;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateOtherIncomeAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * Money received into `account_id` — the account grows and Other Income (4400) is credited.
     *
     * @param  array{other_income_category_id: int|string, account_id: int|string, amount: float|string, income_date: string, note?: string|null}  $data
     */
    public function execute(array $data): OtherIncome
    {
        return DB::transaction(function () use ($data) {
            $amount = round((float) $data['amount'], 2);
            $date = Carbon::parse($data['income_date']);
            $account = Account::findOrFail($data['account_id']);

            $income = OtherIncome::create([
                'other_income_category_id' => $data['other_income_category_id'],
                'account_id' => $account->id,
                'amount' => $amount,
                'income_date' => $date,
                'note' => $data['note'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $this->accounts->record($account, AccountTransactionType::OtherIncome, $amount, $date, 'other_income', $income->id, $data['note'] ?? null);

            $income->loadMissing('category');
            $this->journal->post($date, "Other income: {$income->category->name}", [
                ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0],
                ['chart_of_account_id' => $this->chartOfAccounts->code('4400')->id, 'debit' => 0, 'credit' => $amount],
            ], 'other_income', $income->id);

            return $income;
        });
    }
}
