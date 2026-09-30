<?php

namespace Database\Seeders\Support;

use App\Models\Account;
use App\Models\Contact;
use App\Models\Investor;
use App\Models\Product;
use Database\Seeders\AccountSeeder;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\SupplierSeeder;

/**
 * Re-resolves the demo master data from the database by its stable names/SKUs,
 * so each transaction seeder can run on its own (after its prerequisites have
 * been seeded) instead of being handed objects by one big orchestrating seeder.
 */
class DemoLookup
{
    /**
     * @return array{cash: Account, bank: Account, bkash: Account}
     */
    public static function accounts(): array
    {
        return [
            'cash' => Account::query()->where('name', AccountSeeder::CASH)->firstOrFail(),
            'bank' => Account::query()->where('name', AccountSeeder::BANK)->firstOrFail(),
            'bkash' => Account::query()->where('name', AccountSeeder::BKASH)->firstOrFail(),
        ];
    }

    /**
     * @return array<string, Product>
     */
    public static function products(): array
    {
        return collect(ProductSeeder::SPECS)
            ->map(fn (array $spec) => Product::query()->where('sku', $spec['sku'])->firstOrFail())
            ->all();
    }

    /**
     * @return list<Contact>
     */
    public static function customers(): array
    {
        return array_map(
            fn (array $spec) => Contact::query()->where('name', $spec['name'])->firstOrFail(),
            CustomerSeeder::SPECS,
        );
    }

    /**
     * @return array<string, Contact>
     */
    public static function suppliers(): array
    {
        return collect(SupplierSeeder::SPECS)
            ->map(fn (array $spec) => Contact::query()->where('name', $spec['name'])->firstOrFail())
            ->all();
    }

    public static function investor(string $name): Investor
    {
        return Investor::query()->where('name', $name)->firstOrFail();
    }
}
