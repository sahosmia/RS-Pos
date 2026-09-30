<?php

namespace Database\Seeders;

use App\Actions\Accounting\Account\CreateAccountAction;
use App\Actions\Asset\CreateAssetAction;
use App\Actions\Contact\CreateContactAction;
use App\Actions\Expenses\ExpenseCategory\CreateExpenseCategoryAction;
use App\Actions\OtherLiability\CreateOtherLiabilityAction;
use App\Actions\Products\Product\CreateProductAction;
use App\Models\AccountType;
use App\Models\Brand;
use App\Models\Category;
use App\Models\CompanyLoan;
use App\Models\CustomerGroup;
use App\Models\Investor;
use App\Models\Staff;
use App\Models\Unit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class InitialDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CategorySeeder::class,
            UnitSeeder::class,
            BrandSeeder::class,
            CustomerGroupSeeder::class,
            ExpenseCategorySeeder::class,
            ProductSeeder::class,
            ContactSeeder::class,
            AssetSeeder::class,
            CompanyLoanSeeder::class,
            InvestorSeeder::class,
            OtherLiabilitySeeder::class,
            StaffSeeder::class,
        ]);

        $this->seedAccounts();
    }

    /**
     * @return array<string, Category>
     */
    private function seedCategories(): array
    {
        $names = ['Air Conditioner', 'Refrigerator', 'Television', 'Washing Machine', 'Kitchen Appliance', 'Fan'];

        return collect($names)->mapWithKeys(fn (string $name) => [$name => Category::query()->firstOrCreate(['name' => $name])])->all();
    }

    /**
     * @return array<string, Unit>
     */
    private function seedUnits(): array
    {
        $names = ['Piece', 'Box', 'Set'];

        return collect($names)->mapWithKeys(fn (string $name) => [$name => Unit::query()->firstOrCreate(['name' => $name])])->all();
    }

    /**
     * @return array<string, Brand>
     */
    private function seedBrands(): array
    {
        $names = ['Walton', 'Samsung', 'LG', 'Vision', 'Singer'];

        return collect($names)->mapWithKeys(fn (string $name) => [$name => Brand::query()->firstOrCreate(['name' => $name])])->all();
    }

    private function seedCustomerGroups(): void
    {
        foreach (['Regular', 'Wholesale', 'VIP'] as $name) {
            CustomerGroup::query()->firstOrCreate(['name' => $name]);
        }
    }

    private function seedExpenseCategories(): void
    {
        $createCategory = app(CreateExpenseCategoryAction::class);
        $names = ['Room Rent', 'Electricity Bill', 'Staff Salary', 'Transport', 'Internet Bill'];

        foreach ($names as $name) {
            $createCategory->execute(['name' => $name]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function seedAccounts(): array
    {
        $createAccount = app(CreateAccountAction::class);
        $typeIds = AccountType::query()->pluck('id', 'name');

        return [
            'cash' => $createAccount->execute([
                'name' => 'Cash in Hand',
                'account_type_id' => $typeIds['Cash'] ?? null,
                'opening_balance' => 0,
                'is_default' => true,
            ]),
            'bank' => $createAccount->execute([
                'name' => 'City Bank Ltd — Current A/C',
                'account_type_id' => $typeIds['Bank'] ?? null,
                'account_number' => '1012345678901',
                'opening_balance' => 0,
            ]),
            'bkash' => $createAccount->execute([
                'name' => 'bKash Merchant',
                'account_type_id' => $typeIds['Mobile Banking'] ?? null,
                'opening_balance' => 0,
            ]),
        ];
    }

    /**
     * @param  array<string, Category>  $categories
     * @param  array<string, Unit>  $units
     * @param  array<string, Brand>  $brands
     */
    private function seedProducts(array $categories, array $units, array $brands): void
    {
        $createProduct = app(CreateProductAction::class);
        $piece = $units['Piece']->id;

        $specs = [
            ['name' => 'Walton AC 1.5 Ton Inverter', 'sku' => 'WAL-AC-15T', 'category' => 'Air Conditioner', 'brand' => 'Walton', 'selling_price' => 46000, 'warranty_period_months' => 24, 'has_installation_service' => true, 'track_serial_number' => false],
            ['name' => 'Samsung AC 1 Ton Inverter', 'sku' => 'SAM-AC-1T', 'category' => 'Air Conditioner', 'brand' => 'Samsung', 'selling_price' => 50000, 'warranty_period_months' => 24, 'has_installation_service' => true, 'track_serial_number' => false],
            ['name' => 'Walton Refrigerator 300L', 'sku' => 'WAL-RF-300', 'category' => 'Refrigerator', 'brand' => 'Walton', 'selling_price' => 40000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true],
            ['name' => 'LG Refrigerator 400L', 'sku' => 'LG-RF-400', 'category' => 'Refrigerator', 'brand' => 'LG', 'selling_price' => 68000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true],
            ['name' => 'Samsung LED TV 43"', 'sku' => 'SAM-TV-43', 'category' => 'Television', 'brand' => 'Samsung', 'selling_price' => 35000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true],
            ['name' => 'Walton LED TV 32"', 'sku' => 'WAL-TV-32', 'category' => 'Television', 'brand' => 'Walton', 'selling_price' => 19500, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true],
            ['name' => 'Vision Washing Machine 7kg', 'sku' => 'VIS-WM-7', 'category' => 'Washing Machine', 'brand' => 'Vision', 'selling_price' => 28000, 'warranty_period_months' => 12, 'has_installation_service' => true, 'track_serial_number' => false],
            ['name' => 'Walton Microwave Oven 25L', 'sku' => 'WAL-MW-25', 'category' => 'Kitchen Appliance', 'brand' => 'Walton', 'selling_price' => 11000, 'warranty_period_months' => 6, 'has_installation_service' => false, 'track_serial_number' => false],
            ['name' => 'Singer Rice Cooker 1.8L', 'sku' => 'SIN-RC-18', 'category' => 'Kitchen Appliance', 'brand' => 'Singer', 'selling_price' => 2500, 'warranty_period_months' => null, 'has_installation_service' => false, 'track_serial_number' => false],
            ['name' => 'Vision Ceiling Fan 56"', 'sku' => 'VIS-FN-56', 'category' => 'Fan', 'brand' => 'Vision', 'selling_price' => 1800, 'warranty_period_months' => null, 'has_installation_service' => false, 'track_serial_number' => false],
        ];

        foreach ($specs as $spec) {
            $createProduct->execute([
                'name' => $spec['name'],
                'sku' => $spec['sku'],
                'category_id' => $categories[$spec['category']]->id,
                'brand_id' => $brands[$spec['brand']]->id,
                'unit_id' => $piece,
                'selling_price' => $spec['selling_price'],
                'minimum_stock_level' => 3,
                'warranty_period_months' => $spec['warranty_period_months'],
                'has_installation_service' => $spec['has_installation_service'],
                'track_serial_number' => $spec['track_serial_number'],
                'opening_stock' => 0,
                'opening_stock_cost' => 0,
            ]);
        }
    }

    private function seedContacts(): void
    {
        $createContact = app(CreateContactAction::class);
        $groupIds = CustomerGroup::query()->pluck('id', 'name');

        $customers = [
            ['name' => 'Abdul Karim', 'group' => 'VIP'],
            ['name' => 'Rahima Begum', 'group' => 'Regular'],
            ['name' => 'Mizanur Rahman', 'group' => 'Regular'],
            ['name' => 'Sultana Akter', 'group' => 'Wholesale'],
            ['name' => 'Jashim Uddin', 'group' => 'Regular'],
        ];

        foreach ($customers as $i => $customer) {
            $createContact->execute([
                'name' => $customer['name'],
                'phone' => '+8801'.str_pad((string) (700000001 + $i), 9, '0', STR_PAD_LEFT),
                'type' => 'customer',
                'customer_group_id' => $groupIds[$customer['group']] ?? null,
                'opening_balance' => 0,
            ]);
        }

        $suppliers = [
            'Walton Distribution',
            'Samsung Electronics BD',
            'LG Bangladesh',
            'Vision Emerging',
            'Landlord — Mr. Hasan Ali',
            'DESCO (Electricity)',
        ];

        foreach ($suppliers as $i => $supplierName) {
            $createContact->execute([
                'name' => $supplierName,
                'phone' => '+8801'.str_pad((string) (800000001 + $i), 9, '0', STR_PAD_LEFT),
                'type' => 'supplier',
                'entity_type' => 'business',
                'business_name' => $supplierName,
                'opening_balance' => 0,
            ]);
        }
    }

    private function seedAssets(): void
    {
        $createAsset = app(CreateAssetAction::class);

        // Assets created with 0 opening value and no addTransaction (additions/sales)
        $createAsset->execute([
            'name' => 'Shop Refrigerator',
            'category' => 'Equipment',
            'purchase_date' => Carbon::today()->toDateString(),
            'opening_value' => 0,
        ]);

        $createAsset->execute([
            'name' => 'Delivery Van',
            'category' => 'Vehicle',
            'purchase_date' => Carbon::today()->toDateString(),
            'opening_value' => 0,
        ]);
    }

    private function seedCompanyLoan(): void
    {
        // Loan entity created with 0 initial amount and no disbursement/repayment actions
        CompanyLoan::create([
            'lender_name' => 'City Bank Ltd',
            'loan_amount' => 0,
            'interest_rate' => 0,
            'start_date' => Carbon::today()->toDateString(),
        ]);
    }

    /**
     * @return array<string, Investor>
     */
    private function seedInvestors(): array
    {
        // Investors created without investment/profit_share transactions
        $malek = Investor::create(['name' => 'Abdul Malek']);
        $rafiqul = Investor::create(['name' => 'Rafiqul Islam']);

        return ['malek' => $malek, 'rafiqul' => $rafiqul];
    }

    private function seedOtherLiability(): void
    {
        // Liability created with 0 opening amount and no payment transaction
        app(CreateOtherLiabilityAction::class)->execute([
            'name' => 'Old Unpaid Tax 2024',
            'opening_amount' => 0,
        ]);
    }

    /**
     * @param  array<string, Investor>  $investors
     */
    private function seedStaff(array $investors): void
    {
        // Staff profiles created with base salary info but 0 salary charges/payments/loans
        Staff::firstOrCreate([
            'name' => 'Rafiqul Islam',
        ], [
            'designation' => 'Sales Executive',
            'joining_date' => Carbon::today()->toDateString(),
            'salary_amount' => 18000,
            'investor_id' => $investors['rafiqul']->id ?? null,
        ]);

        Staff::firstOrCreate([
            'name' => 'Nasrin Akter',
        ], [
            'designation' => 'Cashier',
            'joining_date' => Carbon::today()->toDateString(),
            'salary_amount' => 15000,
        ]);
    }
}
