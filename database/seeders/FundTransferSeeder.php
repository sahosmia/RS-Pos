<?php

namespace Database\Seeders;

use App\Actions\Accounting\Account\FundTransferAction;
use App\Models\FundTransfer;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * A demo transfer moving cash from the bank account to the cash drawer.
 * Seeds once: skipped if it already exists.
 */
class FundTransferSeeder extends Seeder
{
    public function run(): void
    {
        if (FundTransfer::query()->where('note', 'Cash replenishment for shop floor')->exists()) {
            $this->command?->warn('The demo fund transfer is already seeded — skipping FundTransferSeeder.');

            return;
        }

        $this->call(AccountSeeder::class);

        $accounts = DemoLookup::accounts();

        app(FundTransferAction::class)->execute(
            $accounts['bank'],
            $accounts['cash'],
            30000,
            Carbon::today()->subDays(1),
            'Cash replenishment for shop floor',
        );
    }
}
