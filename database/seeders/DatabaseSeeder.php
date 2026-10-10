<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * `php artisan db:seed` gives a complete, working demo shop: the login user, shop settings, roles and
     * permissions, then the whole demo scenario (DummyDataSeeder). Every seeder below it is also independent —
     * run whichever you need with `php artisan db:seed --class=<Name>`; each one seeds its own prerequisites
     * and is safe to run again.
     *
     *  Reference data    AccountTypeSeeder, ChartOfAccountSeeder, AccountingPeriodSeeder,
     *                    OtherIncomeCategorySeeder, StaffTransactionTypeSeeder
     *  Master data       CategorySeeder, UnitSeeder, BrandSeeder, CustomerGroupSeeder,
     *                    ExpenseCategorySeeder, AccountSeeder, ProductSeeder (with service plans),
     *                    CustomerSeeder, SupplierSeeder
     *  Demo transactions PurchaseSeeder (+ a return), SaleSeeder (returns, EMI, serials, installation),
     *                    SalesOrderSeeder, ExpenseSeeder, FundTransferSeeder, OtherIncomeSeeder,
     *                    AssetSeeder, CompanyLoanSeeder, InvestorSeeder, OtherLiabilitySeeder, StaffSeeder
     *  After-sale        ServiceRequestSeeder, WarrantyClaimSeeder, CampaignSeeder, NotificationSeeder
     *  Everything        DummyDataSeeder (all of the three groups above, in order)
     *
     * Not part of the default run: HomeApplianceProductSeeder, the ~300-product bulk catalog.
     */
    public function run(): void
    {
        // Safe to run again: the login user is created once.
        if (! User::query()->where('email', 'demo@gmail.com')->exists()) {
            User::factory()->create([
                'name' => 'Demo User',
                'email' => 'demo@gmail.com',
                'username' => 'demo',
                'password' => bcrypt('12345678'),
            ]);
        }

        $this->call([
            SettingsSeeder::class,
            // Gives every user that already exists (the one above) the Admin role.
            RolePermissionSeeder::class,

            DummyDataSeeder::class,
        ]);
    }
}
