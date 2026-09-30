<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * The whole demo scenario in one go — reference data, master data, then every
 * module's demo transactions. Nothing lives here except the order: each piece
 * is its own seeder (and runs on its own with
 * `php artisan db:seed --class=<Name>`, pulling in whatever it depends on).
 * Every seeder is safe to run again: master data uses find-or-create and the
 * transaction seeders skip themselves once their demo records exist.
 *
 * Bulk demo catalog (~300 products) stays separate: HomeApplianceProductSeeder.
 */
class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // Reference data
            AccountTypeSeeder::class,
            ChartOfAccountSeeder::class,
            MiscTransactionCategorySeeder::class,
            StaffTransactionTypeSeeder::class,

            // Master data
            CategorySeeder::class,
            UnitSeeder::class,
            BrandSeeder::class,
            CustomerGroupSeeder::class,
            ExpenseCategorySeeder::class,
            AccountSeeder::class,
            ProductSeeder::class,
            CustomerSeeder::class,
            SupplierSeeder::class,

            // Demo transactions
            PurchaseSeeder::class,
            SaleSeeder::class,
            SalesOrderSeeder::class,
            ExpenseSeeder::class,
            FundTransferSeeder::class,
            CashBookEntrySeeder::class,
            AssetSeeder::class,
            CompanyLoanSeeder::class,
            InvestorSeeder::class,
            OtherLiabilitySeeder::class,
            StaffSeeder::class,
        ]);
    }
}
