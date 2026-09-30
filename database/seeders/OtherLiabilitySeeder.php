<?php

namespace Database\Seeders;

use App\Actions\OtherLiability\AddOtherLiabilityTransactionAction;
use App\Actions\OtherLiability\CreateOtherLiabilityAction;
use App\Models\Account;
use App\Models\OtherLiability;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;

/**
 * A demo unpaid-tax liability with an opening amount and a part payment.
 * Seeds once: skipped if it already exists.
 */
class OtherLiabilitySeeder extends Seeder
{
    public function run(): void
    {
        if (OtherLiability::query()->where('name', 'Old Unpaid Tax 2024')->exists()) {
            $this->command?->warn('The demo liability is already seeded — skipping OtherLiabilitySeeder.');

            return;
        }

        $this->call(AccountSeeder::class);

        $this->seedOtherLiability(DemoLookup::accounts());
    }

    /**
     * @param  array<string, Account>  $accounts
     */
    private function seedOtherLiability(array $accounts): void
    {
        $liability = app(CreateOtherLiabilityAction::class)->execute([
            'name' => 'Old Unpaid Tax 2024',
            'opening_amount' => 12000,
        ]);

        app(AddOtherLiabilityTransactionAction::class)->execute($liability->fresh(), [
            'type' => 'payment',
            'amount' => 5000,
            'account_id' => $accounts['cash']->id,
        ]);
    }
}
