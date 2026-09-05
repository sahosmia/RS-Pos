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
            // Phase 8 (Sales Order) - money collected ahead of delivery; the
            // shop owes goods (or a refund) against it, not cash, so it's a
            // liability until the order converts into a Sale or is refunded.
            ['2150', 'Customer Advances', ChartOfAccountType::Liability, NormalBalance::Credit],
            ['2200', 'Loans Payable', ChartOfAccountType::Liability, NormalBalance::Credit],
            ['2300', 'Other Liabilities', ChartOfAccountType::Liability, NormalBalance::Credit],
            ['3100', "Owner's/Investor's Capital", ChartOfAccountType::Equity, NormalBalance::Credit],
            ['3200', 'Retained Earnings', ChartOfAccountType::Equity, NormalBalance::Credit],
            // V2 (Phase 35 par 3) - the other side of every opening-balance journal entry.
            ['3300', 'Opening Balance Equity', ChartOfAccountType::Equity, NormalBalance::Credit],
            ['4100', 'Sales Revenue', ChartOfAccountType::Income, NormalBalance::Credit],
            ['4200', 'Service/Installation Income', ChartOfAccountType::Income, NormalBalance::Credit],
            // V2 (Phase 35 par 10) - contra-income: type stays 'income' for reporting
            // grouping, but its normal balance is debit, since it nets *against*
            // 4100 rather than adding to it.
            ['4150', 'Sales Returns & Allowances', ChartOfAccountType::Income, NormalBalance::Debit],
            ['5100', 'Cost of Goods Sold', ChartOfAccountType::Expense, NormalBalance::Debit],
            // V2 (Phase 35 par 11).
            ['5900', 'Interest Expense', ChartOfAccountType::Expense, NormalBalance::Debit],
            // Expense module (Phase 9) doesn't exist yet - this is a placeholder
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
