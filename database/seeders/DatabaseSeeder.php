<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Only the essentials run by default. Every other seeder is independent —
     * run whichever you need, whenever you need it, with
     * `php artisan db:seed --class=<Name>` (each one seeds its own
     * prerequisites, and is safe to run again):
     *
     *  Reference data   AccountTypeSeeder, ChartOfAccountSeeder, AccountingPeriodSeeder,
     *                   MiscTransactionCategorySeeder, StaffTransactionTypeSeeder, CashBookSeeder
     *  Master data      CategorySeeder, UnitSeeder, BrandSeeder, CustomerGroupSeeder,
     *                   ExpenseCategorySeeder, AccountSeeder, ProductSeeder,
     *                   CustomerSeeder, SupplierSeeder, HomeApplianceProductSeeder (~300 products)
     *  Demo transactions PurchaseSeeder, SaleSeeder, SalesOrderSeeder, ExpenseSeeder,
     *                   FundTransferSeeder, CashBookEntrySeeder, AssetSeeder,
     *                   CompanyLoanSeeder, InvestorSeeder, OtherLiabilitySeeder, StaffSeeder
     *  Everything       DummyDataSeeder (all of the above, in order)
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $this->call([
            SettingsSeeder::class,
            RolePermissionSeeder::class,

            // Product
            CategorySeeder::class,
            UnitSeeder::class,
            BrandSeeder::class,
            ProductSeeder::class,

            //  // Account
            // AccountTypeSeeder::class,
            // AccountSeeder::class,
            // ChartOfAccountSeeder::class,
            // AccountingPeriodSeeder::class,
            // MiscTransactionCategorySeeder::class,
            // CashBookSeeder::class,
            // FundTransferSeeder::class,
            // CashBookEntrySeeder::class,

            // // Customer/Supplier
            // CustomerGroupSeeder::class,
            // CustomerSeeder::class,
            // SupplierSeeder::class,

            // // Purchase/Sale/Return demo scenarios
            // PurchaseSeeder::class,
            // SaleSeeder::class,
            // SalesOrderSeeder::class,

            // //staff
            // StaffSeeder::class,
            // StaffTransactionTypeSeeder::class,

            // // Expense
            // ExpenseCategorySeeder::class,
            // ExpenseSeeder::class,

            // // investor
            // CompanyLoanSeeder::class,
            // InvestorSeeder::class,

            // AssetSeeder::class,
            // OtherLiabilitySeeder::class,
        ]);
    }
}
