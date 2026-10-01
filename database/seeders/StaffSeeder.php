<?php

namespace Database\Seeders;

use App\Actions\Staff\AddStaffTransactionAction;
use App\Models\Account;
use App\Models\Investor;
use App\Models\Staff;
use App\Models\StaffTransactionType;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Two demo staff — one who is also an investor — with salary charges,
 * payments, an advance and a loan. Seeds once: skipped if the demo staff
 * already exist.
 */
class StaffSeeder extends Seeder
{
    public function run(): void
    {
        if (Staff::query()->where('name', 'Rafiqul Islam')->exists()) {
            $this->command?->warn('Demo staff are already seeded — skipping StaffSeeder.');

            return;
        }

        $this->call([AccountSeeder::class, StaffTransactionTypeSeeder::class, InvestorSeeder::class]);

        $this->seedStaff(DemoLookup::accounts(), ['rafiqul' => DemoLookup::investor('Rafiqul Islam')]);
    }

    /**
     * @param  array<string, Account>  $accounts
     * @param  array<string, Investor>  $investors
     */
    private function seedStaff(array $accounts, array $investors): void
    {
        $addTransaction = app(AddStaffTransactionAction::class);
        $types = StaffTransactionType::query()->pluck('id', 'name');

        // Rafiqul Islam — also an investor (see seedInvestors); a month's
        // salary paid, plus an advance still owed back.
        $rafiqul = Staff::factory()->create([
            'name' => 'Rafiqul Islam',
            'designation' => 'Sales Executive',
            'joining_date' => Carbon::today()->subMonths(6)->toDateString(),
            'salary_amount' => 18000,
            'investor_id' => $investors['rafiqul']->id,
        ]);
        $addTransaction->execute($rafiqul->fresh(), ['staff_transaction_type_id' => $types['Salary'], 'amount' => 18000, 'account_id' => $accounts['bank']->id]);
        $addTransaction->execute($rafiqul->fresh(), ['staff_transaction_type_id' => $types['Advance'], 'amount' => 3000, 'account_id' => $accounts['cash']->id]);

        // Nasrin Akter — salary paid, then a small advance.
        $nasrin = Staff::factory()->create([
            'name' => 'Nasrin Akter',
            'designation' => 'Cashier',
            'joining_date' => Carbon::today()->subMonths(3)->toDateString(),
            'salary_amount' => 15000,
        ]);
        $addTransaction->execute($nasrin->fresh(), ['staff_transaction_type_id' => $types['Salary'], 'amount' => 15000, 'account_id' => $accounts['cash']->id]);
        $addTransaction->execute($nasrin->fresh(), ['staff_transaction_type_id' => $types['Advance'], 'amount' => 5000, 'account_id' => $accounts['bank']->id]);
    }
}
