<?php

namespace App\Actions\Expenses\ExpenseCategory;

use App\Enums\ChartOfAccountType;
use App\Enums\NormalBalance;
use App\Models\ChartOfAccount;
use App\Models\ExpenseCategory;
use App\Services\ChartOfAccountResolver;
use Illuminate\Support\Facades\DB;

class CreateExpenseCategoryAction
{
    public function __construct(
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, parent_id?: int|null}  $data
     */
    public function execute(array $data): ExpenseCategory
    {
        return DB::transaction(function () use ($data) {
            $chartOfAccount = $this->createSubAccount($data['name']);

            return ExpenseCategory::create([
                'name' => $data['name'],
                'parent_id' => $data['parent_id'] ?? null,
                'chart_of_account_id' => $chartOfAccount->id,
            ]);
        });
    }

    /**
     * Every expense category gets its own General Ledger sub-account,
     * auto-created under 5200 General Expenses — never manually picked by
     * whoever adds the category.
     */
    private function createSubAccount(string $name): ChartOfAccount
    {
        $parent = $this->chartOfAccounts->code('5200');

        return ChartOfAccount::create([
            'code' => $this->chartOfAccounts->nextChildCode($parent),
            'name' => $name,
            'type' => ChartOfAccountType::Expense,
            'normal_balance' => NormalBalance::Debit,
            'parent_id' => $parent->id,
        ]);
    }
}
