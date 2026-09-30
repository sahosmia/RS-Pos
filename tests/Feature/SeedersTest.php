<?php

use App\Models\Account;
use App\Models\Asset;
use App\Models\Category;
use App\Models\CompanyLoan;
use App\Models\Contact;
use App\Models\Expense;
use App\Models\Investor;
use App\Models\OtherLiability;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Staff;
use Database\Seeders\AccountSeeder;
use Database\Seeders\AssetSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\CompanyLoanSeeder;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\DummyDataSeeder;
use Database\Seeders\ExpenseSeeder;
use Database\Seeders\InvestorSeeder;
use Database\Seeders\OtherLiabilitySeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\PurchaseSeeder;
use Database\Seeders\SaleSeeder;
use Database\Seeders\SalesOrderSeeder;
use Database\Seeders\StaffSeeder;
use Database\Seeders\SupplierSeeder;

/*
 * Each seeder must be runnable on its own, on a database that has nothing but
 * the migrations (and the chart of accounts every test already gets), and
 * again afterwards without duplicating anything.
 */

test('the master data seeders each run on their own', function () {
    $this->seed(CategorySeeder::class);
    expect(Category::query()->count())->toBe(count(CategorySeeder::NAMES));

    $this->seed(AccountSeeder::class);
    expect(Account::query()->pluck('current_balance', 'name')->all())->toBe([
        'Cash in Hand' => 100000.0,
        'City Bank Ltd — Current A/C' => 1000000.0,
        'bKash Merchant' => 50000.0,
    ]);

    $this->seed(ProductSeeder::class);
    expect(Product::query()->count())->toBe(10);

    $this->seed(CustomerSeeder::class);
    $this->seed(SupplierSeeder::class);
    expect(Contact::query()->count())->toBe(11);
});

test('master data seeders can be run again without duplicating anything', function () {
    foreach ([AccountSeeder::class, ProductSeeder::class, CustomerSeeder::class, SupplierSeeder::class] as $seeder) {
        $this->seed($seeder);
        $this->seed($seeder);
    }

    expect(Account::query()->count())->toBe(3)
        ->and(Product::query()->count())->toBe(10)
        ->and(Contact::query()->count())->toBe(11);
});

test('a transaction seeder seeds its own prerequisites', function () {
    $this->seed(SaleSeeder::class);

    // Sales need stock, so the purchases (and the products/accounts/contacts they need) came along.
    expect(Sale::query()->count())->toBeGreaterThan(0)
        ->and(Purchase::query()->count())->toBeGreaterThan(0)
        ->and(Product::query()->count())->toBe(10)
        ->and(Account::query()->count())->toBe(3);
});

test('transaction seeders skip themselves once their demo records exist', function () {
    $this->seed(PurchaseSeeder::class);
    $this->seed(SaleSeeder::class);
    $purchases = Purchase::query()->count();
    $sales = Sale::query()->count();

    $this->seed(PurchaseSeeder::class);
    $this->seed(SaleSeeder::class);

    expect(Purchase::query()->count())->toBe($purchases)
        ->and(Sale::query()->count())->toBe($sales);
});

test('every other module seeder runs on its own', function () {
    foreach ([SalesOrderSeeder::class, ExpenseSeeder::class, AssetSeeder::class, CompanyLoanSeeder::class, InvestorSeeder::class, OtherLiabilitySeeder::class, StaffSeeder::class] as $seeder) {
        $this->seed($seeder);
    }

    expect(Expense::query()->count())->toBe(6)
        ->and(Asset::query()->count())->toBe(3)
        ->and(CompanyLoan::query()->count())->toBe(1)
        ->and(Investor::query()->count())->toBe(2)
        ->and(OtherLiability::query()->count())->toBe(1)
        ->and(Staff::query()->count())->toBe(2);
});

test('DummyDataSeeder seeds the whole demo scenario and is safe to run twice', function () {
    $this->seed(DummyDataSeeder::class);
    $counts = [Sale::query()->count(), Purchase::query()->count(), Expense::query()->count(), Account::query()->count()];

    $this->seed(DummyDataSeeder::class);

    expect([Sale::query()->count(), Purchase::query()->count(), Expense::query()->count(), Account::query()->count()])->toBe($counts);
});
