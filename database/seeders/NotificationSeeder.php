<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

/**
 * Fills the shop owner's notification bell by running the same sweep the scheduler runs every morning
 * (`notifications:generate`): low-stock products and unpaid sales. It needs the demo sales and stock, so it seeds
 * those first. Safe to run again — the sweep skips anything that already has an unread alert.
 */
class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(SaleSeeder::class);

        Artisan::call('notifications:generate');
    }
}
