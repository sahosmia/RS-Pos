<?php

namespace Database\Factories;

use App\Models\Settings;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Settings>
 */
class SettingsFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shop_name' => $this->faker->company(),
            'currency_symbol' => '৳',
            'invoice_prefix' => 'INV-',
            'invoice_next_number' => 1,
            'purchase_prefix' => 'PUR-',
            'purchase_next_number' => 1,
            'thermal_printer_enabled' => false,
            'emi_module_enabled' => false,
            'serial_number_module_enabled' => false,
            'fiscal_year_start_month' => 7,
        ];
    }
}
