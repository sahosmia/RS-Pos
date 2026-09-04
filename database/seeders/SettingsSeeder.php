<?php

namespace Database\Seeders;

use App\Models\Settings;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Settings::query()->firstOrCreate([], [
            'shop_name' => 'আমার দোকান',
            'currency_symbol' => '৳',
            'invoice_prefix' => 'INV-',
            'invoice_next_number' => 1,
            'purchase_prefix' => 'PUR-',
            'purchase_next_number' => 1,
            'thermal_printer_enabled' => false,
            'emi_module_enabled' => false,
            'serial_number_module_enabled' => false,
            'fiscal_year_start_month' => 7,
        ]);
    }
}
