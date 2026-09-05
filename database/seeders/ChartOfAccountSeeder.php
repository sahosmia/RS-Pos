<?php

namespace Database\Seeders;

use App\Enums\ChartOfAccountType;
use App\Enums\NormalBalance;
use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class ChartOfAccountSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        collect([
            ['1010', 'Cash in Hand', ChartOfAccountType::Asset, NormalBalance::Debit],
            ['1020', 'Bank Accounts', ChartOfAccountType::Asset, NormalBalance::Debit],
            ['1100', 'Accounts Receivable', ChartOfAccountType::Asset, NormalBalance::Debit],
            ['1200', 'Inventory', ChartOfAccountType::Asset, NormalBalance::Debit],
            ['1300', 'Staff Advances', ChartOfAccountType::Asset, NormalBalance::Debit],
            ['1400', 'Fixed Assets', ChartOfAccountType::Asset, NormalBalance::Debit],
            ['2100', 'Accounts Payable', ChartOfAccountType::Liability, NormalBalance::Credit],
            ['2200', 'Loans Payable', ChartOfAccountType::Liability, NormalBalance::Credit],
            ['2300', 'Other Liabilities', ChartOfAccountType::Liability, NormalBalance::Credit],
            ['3100', "Owner's/Investor's Capital", ChartOfAccountType::Equity, NormalBalance::Credit],
            ['3200', 'Retained Earnings', ChartOfAccountType::Equity, NormalBalance::Credit],
            ['4100', 'Sales Revenue', ChartOfAccountType::Income, NormalBalance::Credit],
            ['4200', 'Service/Installation Income', ChartOfAccountType::Income, NormalBalance::Credit],
            ['5100', 'Cost of Goods Sold', ChartOfAccountType::Expense, NormalBalance::Debit],
            // Expense module (পর্ব ৭) doesn't exist yet — this is a placeholder
            // until each expense_category gets its own 52xx sub-account.
            ['5200', 'General Expenses', ChartOfAccountType::Expense, NormalBalance::Debit],
        ])->each(fn (array $row) => $this->account(...$row));
    }

    private function account(
        string $code,
        string $name,
        ChartOfAccountType $type,
        NormalBalance $normalBalance,
        ?ChartOfAccount $parent = null,
    ): ChartOfAccount {
        return ChartOfAccount::query()->firstOrCreate(
            ['code' => $code],
            [
                'name' => $name,
                'type' => $type,
                'normal_balance' => $normalBalance,
                'parent_id' => $parent?->id,
                'is_active' => true,
            ],
        );
    }
}
