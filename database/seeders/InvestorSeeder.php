<?php

namespace Database\Seeders;

use App\Actions\Investor\AddInvestorTransactionAction;
use App\Models\Account;
use App\Models\Investor;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;

/**
 * Two demo investors with investments (and a profit share for one). Seeds
 * once: skipped if the demo investors already exist.
 */
class InvestorSeeder extends Seeder
{
    public function run(): void
    {
        if (Investor::query()->where('name', 'Abdul Malek')->exists()) {
            $this->command?->warn('Demo investors are already seeded — skipping InvestorSeeder.');

            return;
        }

        $this->call(AccountSeeder::class);

        $this->seedInvestors(DemoLookup::accounts());
    }

    /**
     * @param  array<string, Account>  $accounts
     * @return array<string, Investor>
     */
    private function seedInvestors(array $accounts): array
    {
        $addTransaction = app(AddInvestorTransactionAction::class);

        $malek = Investor::create(['name' => 'Abdul Malek']);
        $addTransaction->execute($malek, ['type' => 'investment', 'amount' => 300000, 'account_id' => $accounts['bank']->id]);
        $addTransaction->execute($malek->fresh(), ['type' => 'profit_share', 'amount' => 15000, 'account_id' => $accounts['cash']->id]);

        // A separate investor record for the staff member who has also put
        // capital in — Staff::investor_id links to this (Phase 13's
        // Staff-as-Investor: no new structure, just reuses this module).
        $rafiqul = Investor::create(['name' => 'Rafiqul Islam']);
        $addTransaction->execute($rafiqul, ['type' => 'investment', 'amount' => 50000, 'account_id' => $accounts['bank']->id]);

        return ['malek' => $malek->fresh(), 'rafiqul' => $rafiqul->fresh()];
    }
}
