<?php

namespace Database\Seeders;

use App\Enums\BalanceEffect;
use App\Enums\StaffTransactionNature;
use App\Models\StaffTransactionType;
use Illuminate\Database\Seeder;

class StaffTransactionTypeSeeder extends Seeder
{
    /**
     * Starting point only — shop owners can add their own types later
     * (same "seeded, admin-manageable" pattern as Account Type). Adjustment
     * is seeded as two directional rows rather than one, since
     * staff_ledger.amount is always a positive magnitude — the type's
     * effect_on_balance is what supplies the sign.
     */
    public function run(): void
    {
        collect([
            ['Salary Charge', BalanceEffect::Decrease, StaffTransactionNature::Expense],
            ['Salary Payment', BalanceEffect::Increase, StaffTransactionNature::Settlement],
            ['Advance Given', BalanceEffect::Increase, StaffTransactionNature::Advance],
            ['Loan Given', BalanceEffect::Increase, StaffTransactionNature::Advance],
            ['Adjustment (Increase)', BalanceEffect::Increase, StaffTransactionNature::Adjustment],
            ['Adjustment (Decrease)', BalanceEffect::Decrease, StaffTransactionNature::Adjustment],
        ])->each(fn (array $row) => StaffTransactionType::query()->firstOrCreate(
            ['name' => $row[0]],
            ['effect_on_balance' => $row[1], 'nature' => $row[2]],
        ));
    }
}
