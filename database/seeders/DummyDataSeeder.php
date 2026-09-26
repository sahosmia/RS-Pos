<?php

namespace Database\Seeders;

use App\Actions\Accounting\Account\CreateAccountAction;
use App\Actions\Accounting\Account\FundTransferAction;
use App\Actions\Accounting\CashBook\RecordCashBookEntryAction;
use App\Actions\Asset\AddAssetTransactionAction;
use App\Actions\Asset\CreateAssetAction;
use App\Actions\CompanyLoan\AddLoanTransactionAction;
use App\Actions\Contact\CreateContactAction;
use App\Actions\Expenses\Expense\AddExpensePaymentAction;
use App\Actions\Expenses\Expense\CreateExpenseAction;
use App\Actions\Expenses\ExpenseCategory\CreateExpenseCategoryAction;
use App\Actions\Investor\AddInvestorTransactionAction;
use App\Actions\OtherLiability\AddOtherLiabilityTransactionAction;
use App\Actions\OtherLiability\CreateOtherLiabilityAction;
use App\Actions\Products\Product\CreateProductAction;
use App\Actions\Purchases\Purchase\AddPurchasePaymentAction;
use App\Actions\Purchases\Purchase\ConfirmPurchaseAction;
use App\Actions\Purchases\Purchase\CreatePurchaseAction;
use App\Actions\Purchases\PurchaseReturn\CreatePurchaseReturnAction;
use App\Actions\Sales\Sale\AddSalePaymentAction;
use App\Actions\Sales\Sale\CancelSaleAction;
use App\Actions\Sales\Sale\ConfirmSaleAction;
use App\Actions\Sales\Sale\CreateSaleAction;
use App\Actions\Sales\Sale\PayEmiInstallmentAction;
use App\Actions\Sales\SaleReturn\CreateSaleReturnAction;
use App\Actions\Sales\SaleReturn\RefundSaleReturnAction;
use App\Actions\Sales\SalesOrder\ConvertSalesOrderToSaleAction;
use App\Actions\Sales\SalesOrder\CreateSalesOrderAction;
use App\Actions\Staff\AddStaffTransactionAction;
use App\Enums\SerialNumberStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Brand;
use App\Models\Category;
use App\Models\CompanyLoan;
use App\Models\Contact;
use App\Models\CustomerGroup;
use App\Models\EmiInstallment;
use App\Models\Investor;
use App\Models\MiscTransactionCategory;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SerialNumber;
use App\Models\Staff;
use App\Models\StaffTransactionType;
use App\Models\Unit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;

/**
 * Realistic demo data across every module built so far, so the UI has
 * something to browse instead of empty tables. Always goes through the same
 * Actions the controllers use (never a raw ::create() for anything with
 * stock/ledger/account/journal side effects), so it's internally consistent
 * the same way real usage would produce it — not a shortcut, the actual
 * flow. Safe to run repeatedly on a fresh `migrate:fresh --seed`; not
 * idempotent against a database that already has real data (home-appliance
 * shop scenario, matching the domain this app is designed for).
 */
class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        $categories = $this->seedCategories();
        $units = $this->seedUnits();
        $brands = $this->seedBrands();
        $this->seedCustomerGroups();

        $accounts = $this->seedAccounts();
        $products = $this->seedProducts($categories, $units, $brands);
        $contacts = $this->seedContacts();

        $this->seedPurchases($contacts, $products, $accounts);
        $this->seedSales($contacts, $products, $accounts);
        $this->seedSalesOrders($contacts, $products, $accounts);
        $this->seedExpenses($contacts, $accounts);
        $this->seedCashBookAndTransfer($accounts);

        $this->seedAssets($accounts);
        $this->seedCompanyLoan($accounts);
        $investors = $this->seedInvestors($accounts);
        $this->seedOtherLiability($accounts);
        $this->seedStaff($accounts, $investors);

        Artisan::call('emi:mark-overdue');
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

    /**
     * @return array<string, Account>
     */
    private function seedAccounts(): array
    {
        $createAccount = app(CreateAccountAction::class);
        $typeIds = AccountType::query()->pluck('id', 'name');

        return [
            'cash' => $createAccount->execute([
                'name' => 'Cash in Hand',
                'account_type_id' => $typeIds['Cash'],
                'opening_balance' => 100000,
            ]),
            'bank' => $createAccount->execute([
                'name' => 'City Bank Ltd — Current A/C',
                'account_type_id' => $typeIds['Bank'],
                'account_number' => '1012345678901',
                'opening_balance' => 1000000,
            ]),
            'bkash' => $createAccount->execute([
                'name' => 'bKash Merchant',
                'account_type_id' => $typeIds['Mobile Banking'],
                'opening_balance' => 50000,
            ]),
        ];
    }

    /**
     * @param  array<string, Category>  $categories
     * @param  array<string, Unit>  $units
     * @param  array<string, Brand>  $brands
     * @return array<string, Product>
     */
    private function seedProducts(array $categories, array $units, array $brands): array
    {
        $createProduct = app(CreateProductAction::class);
        $piece = $units['Piece']->id;

        // Serial-tracked products deliberately start with opening_stock 0 —
        // CreateProductAction's opening stock movement doesn't create
        // serial_numbers rows, so every serialized unit must enter through
        // a Purchase instead (which does), never opening stock.
        $specs = [
            'walton_ac' => ['name' => 'Walton AC 1.5 Ton Inverter', 'sku' => 'WAL-AC-15T', 'category' => 'Air Conditioner', 'brand' => 'Walton', 'selling_price' => 46000, 'warranty_period_months' => 24, 'has_installation_service' => true, 'track_serial_number' => false, 'opening_stock' => 5, 'opening_stock_cost' => 36000],
            'samsung_ac' => ['name' => 'Samsung AC 1 Ton Inverter', 'sku' => 'SAM-AC-1T', 'category' => 'Air Conditioner', 'brand' => 'Samsung', 'selling_price' => 50000, 'warranty_period_months' => 24, 'has_installation_service' => true, 'track_serial_number' => false, 'opening_stock' => 4, 'opening_stock_cost' => 40000],
            'walton_fridge' => ['name' => 'Walton Refrigerator 300L', 'sku' => 'WAL-RF-300', 'category' => 'Refrigerator', 'brand' => 'Walton', 'selling_price' => 40000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true, 'opening_stock' => 0, 'opening_stock_cost' => 0],
            'lg_fridge' => ['name' => 'LG Refrigerator 400L', 'sku' => 'LG-RF-400', 'category' => 'Refrigerator', 'brand' => 'LG', 'selling_price' => 68000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true, 'opening_stock' => 0, 'opening_stock_cost' => 0],
            'samsung_tv' => ['name' => 'Samsung LED TV 43"', 'sku' => 'SAM-TV-43', 'category' => 'Television', 'brand' => 'Samsung', 'selling_price' => 35000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true, 'opening_stock' => 0, 'opening_stock_cost' => 0],
            'walton_tv' => ['name' => 'Walton LED TV 32"', 'sku' => 'WAL-TV-32', 'category' => 'Television', 'brand' => 'Walton', 'selling_price' => 19500, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true, 'opening_stock' => 0, 'opening_stock_cost' => 0],
            'vision_wm' => ['name' => 'Vision Washing Machine 7kg', 'sku' => 'VIS-WM-7', 'category' => 'Washing Machine', 'brand' => 'Vision', 'selling_price' => 28000, 'warranty_period_months' => 12, 'has_installation_service' => true, 'track_serial_number' => false, 'opening_stock' => 5, 'opening_stock_cost' => 21000],
            'walton_microwave' => ['name' => 'Walton Microwave Oven 25L', 'sku' => 'WAL-MW-25', 'category' => 'Kitchen Appliance', 'brand' => 'Walton', 'selling_price' => 11000, 'warranty_period_months' => 6, 'has_installation_service' => false, 'track_serial_number' => false, 'opening_stock' => 12, 'opening_stock_cost' => 7800],
            'singer_rice_cooker' => ['name' => 'Singer Rice Cooker 1.8L', 'sku' => 'SIN-RC-18', 'category' => 'Kitchen Appliance', 'brand' => 'Singer', 'selling_price' => 2500, 'warranty_period_months' => null, 'has_installation_service' => false, 'track_serial_number' => false, 'opening_stock' => 20, 'opening_stock_cost' => 1800],
            'vision_fan' => ['name' => 'Vision Ceiling Fan 56"', 'sku' => 'VIS-FN-56', 'category' => 'Fan', 'brand' => 'Vision', 'selling_price' => 1800, 'warranty_period_months' => null, 'has_installation_service' => false, 'track_serial_number' => false, 'opening_stock' => 30, 'opening_stock_cost' => 1150],
        ];

        $products = [];

        foreach ($specs as $key => $spec) {
            $products[$key] = $createProduct->execute([
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
                'opening_stock' => $spec['opening_stock'],
                'opening_stock_cost' => $spec['opening_stock_cost'],
            ]);
        }

        return $products;
    }

    /**
     * @return array{customers: array<int, Contact>, suppliers: array<string, Contact>}
     */
    private function seedContacts(): array
    {
        $createContact = app(CreateContactAction::class);
        $groupIds = CustomerGroup::query()->pluck('id', 'name');

        $customerSpecs = [
            ['name' => 'Abdul Karim', 'group' => 'VIP', 'opening_balance' => 0],
            ['name' => 'Rahima Begum', 'group' => 'Regular', 'opening_balance' => 5000],
            ['name' => 'Mizanur Rahman', 'group' => 'Regular', 'opening_balance' => 0],
            ['name' => 'Sultana Akter', 'group' => 'Wholesale', 'opening_balance' => 0],
            ['name' => 'Jashim Uddin', 'group' => 'Regular', 'opening_balance' => 0],
        ];

        $customers = [];
        foreach ($customerSpecs as $i => $spec) {
            $customers[] = $createContact->execute([
                'name' => $spec['name'],
                'phone' => '+8801'.str_pad((string) (700000001 + $i), 9, '0', STR_PAD_LEFT),
                'type' => 'customer',
                'customer_group_id' => $groupIds[$spec['group']],
                'opening_balance' => $spec['opening_balance'],
            ]);
        }

        $supplierSpecs = [
            'walton' => ['name' => 'Walton Distribution', 'opening_balance' => -15000],
            'samsung' => ['name' => 'Samsung Electronics BD', 'opening_balance' => 0],
            'lg' => ['name' => 'LG Bangladesh', 'opening_balance' => 0],
            'vision' => ['name' => 'Vision Emerging', 'opening_balance' => 0],
            'landlord' => ['name' => 'Landlord — Mr. Hasan Ali', 'opening_balance' => 0],
            'desco' => ['name' => 'DESCO (Electricity)', 'opening_balance' => 0],
        ];

        $suppliers = [];
        $i = 0;
        foreach ($supplierSpecs as $key => $spec) {
            $suppliers[$key] = $createContact->execute([
                'name' => $spec['name'],
                'phone' => '+8801'.str_pad((string) (800000001 + $i), 9, '0', STR_PAD_LEFT),
                'type' => 'supplier',
                'entity_type' => 'business',
                'business_name' => $spec['name'],
                'opening_balance' => $spec['opening_balance'],
            ]);
            $i++;
        }

        return ['customers' => $customers, 'suppliers' => $suppliers];
    }

    /**
     * @param  array{customers: array<int, Contact>, suppliers: array<string, Contact>}  $contacts
     * @param  array<string, Product>  $products
     * @param  array<string, Account>  $accounts
     */
    private function seedPurchases(array $contacts, array $products, array $accounts): void
    {
        $createPurchase = app(CreatePurchaseAction::class);
        $confirmPurchase = app(ConfirmPurchaseAction::class);
        $addPayment = app(AddPurchasePaymentAction::class);
        $createReturn = app(CreatePurchaseReturnAction::class);
        $suppliers = $contacts['suppliers'];

        // P1 — Walton: fully paid via Bank at receipt.
        $p1 = $createPurchase->execute([
            'supplier_id' => $suppliers['walton']->id,
            'purchase_date' => Carbon::today()->subDays(20)->toDateString(),
            'status' => 'ordered',
            'items' => [
                ['product_id' => $products['walton_ac']->id, 'quantity' => 3, 'unit_price' => 37000],
                ['product_id' => $products['walton_fridge']->id, 'quantity' => 5, 'unit_price' => 31000],
                ['product_id' => $products['walton_tv']->id, 'quantity' => 6, 'unit_price' => 14500],
                ['product_id' => $products['walton_microwave']->id, 'quantity' => 5, 'unit_price' => 7800],
            ],
        ]);
        $this->confirmPurchaseWithSerials($p1, $confirmPurchase, [['account_id' => $accounts['bank']->id, 'amount' => 392000]]);

        // P2 — Samsung: half paid via Bank, rest due.
        $p2 = $createPurchase->execute([
            'supplier_id' => $suppliers['samsung']->id,
            'purchase_date' => Carbon::today()->subDays(15)->toDateString(),
            'status' => 'ordered',
            'items' => [
                ['product_id' => $products['samsung_ac']->id, 'quantity' => 3, 'unit_price' => 41000],
                ['product_id' => $products['samsung_tv']->id, 'quantity' => 8, 'unit_price' => 27000],
            ],
        ]);
        $this->confirmPurchaseWithSerials($p2, $confirmPurchase, [['account_id' => $accounts['bank']->id, 'amount' => 169500]]);

        // P3 — LG: received fully due, paid down later, one unit returned.
        $p3 = $createPurchase->execute([
            'supplier_id' => $suppliers['lg']->id,
            'purchase_date' => Carbon::today()->subDays(12)->toDateString(),
            'status' => 'ordered',
            'items' => [
                ['product_id' => $products['lg_fridge']->id, 'quantity' => 5, 'unit_price' => 54000],
            ],
        ]);
        $this->confirmPurchaseWithSerials($p3, $confirmPurchase, []);
        $addPayment->execute($p3->fresh(), [['account_id' => $accounts['bank']->id, 'amount' => 150000]]);
        $createReturn->execute([
            'purchase_id' => $p3->id,
            'return_date' => Carbon::today()->subDays(10)->toDateString(),
            'reason' => 'Scratched unit found during inspection',
            'items' => [['purchase_item_id' => $p3->items()->first()->id, 'quantity' => 1]],
        ]);

        // P4 — Vision: fully paid via Cash at receipt.
        $p4 = $createPurchase->execute([
            'supplier_id' => $suppliers['vision']->id,
            'purchase_date' => Carbon::today()->subDays(8)->toDateString(),
            'status' => 'ordered',
            'items' => [
                ['product_id' => $products['vision_wm']->id, 'quantity' => 3, 'unit_price' => 21000],
                ['product_id' => $products['vision_fan']->id, 'quantity' => 10, 'unit_price' => 1150],
            ],
        ]);
        $this->confirmPurchaseWithSerials($p4, $confirmPurchase, [['account_id' => $accounts['cash']->id, 'amount' => 74500]]);
    }

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function confirmPurchaseWithSerials(Purchase $purchase, ConfirmPurchaseAction $confirmPurchase, array $payments): void
    {
        $purchase->load('items.product');
        $serialSelections = [];

        foreach ($purchase->items as $item) {
            if (! $item->product->track_serial_number) {
                continue;
            }

            $serials = [];
            for ($n = 1; $n <= (int) $item->quantity; $n++) {
                $serials[] = $item->product->sku.'-'.str_pad((string) $n, 3, '0', STR_PAD_LEFT);
            }
            $serialSelections[$item->id] = $serials;
        }

        $confirmPurchase->execute($purchase, $payments, 0.0, $serialSelections);
    }

    /**
     * @param  array<int, string>  $serials  Out param — filled with the serials actually assigned, in case the caller needs to reference them.
     */
    private function pickInStockSerials(Product $product, int $quantity): array
    {
        return SerialNumber::query()
            ->where('product_id', $product->id)
            ->where('status', SerialNumberStatus::InStock)
            ->orderBy('id')
            ->limit($quantity)
            ->pluck('serial_number')
            ->all();
    }

    /**
     * @param  array{customers: array<int, Contact>, suppliers: array<string, Contact>}  $contacts
     * @param  array<string, Product>  $products
     * @param  array<string, Account>  $accounts
     */
    private function seedSales(array $contacts, array $products, array $accounts): void
    {
        $createSale = app(CreateSaleAction::class);
        $confirmSale = app(ConfirmSaleAction::class);
        $addPayment = app(AddSalePaymentAction::class);
        $cancelSale = app(CancelSaleAction::class);
        $createReturn = app(CreateSaleReturnAction::class);
        $refundReturn = app(RefundSaleReturnAction::class);
        $payEmiInstallment = app(PayEmiInstallmentAction::class);
        [$karim, $rahima, $mizan, $sultana, $jashim] = $contacts['customers'];

        // S1 — Abdul Karim: fully paid via Cash.
        $s1 = $createSale->execute([
            'customer_id' => $karim->id,
            'sale_date' => Carbon::today()->subDays(9)->toDateString(),
            'status' => 'draft',
            'items' => [
                ['product_id' => $products['walton_ac']->id, 'quantity' => 1, 'unit_price' => 46000, 'installation_required' => true, 'installation_charge' => 1000],
                ['product_id' => $products['walton_microwave']->id, 'quantity' => 1, 'unit_price' => 11000],
            ],
        ]);
        $this->confirmSaleWithSerials($s1, $confirmSale, [['account_id' => $accounts['cash']->id, 'amount' => 58000]]);

        // S2 — Rahima Begum: half paid via Bank, rest due.
        $s2 = $createSale->execute([
            'customer_id' => $rahima->id,
            'sale_date' => Carbon::today()->subDays(8)->toDateString(),
            'status' => 'draft',
            'items' => [
                ['product_id' => $products['samsung_tv']->id, 'quantity' => 1, 'unit_price' => 35000],
                ['product_id' => $products['singer_rice_cooker']->id, 'quantity' => 1, 'unit_price' => 2500],
            ],
        ]);
        $this->confirmSaleWithSerials($s2, $confirmSale, [['account_id' => $accounts['bank']->id, 'amount' => 18750]]);

        // S3 — Mizanur Rahman: fully paid via bKash.
        $s3 = $createSale->execute([
            'customer_id' => $mizan->id,
            'sale_date' => Carbon::today()->subDays(7)->toDateString(),
            'status' => 'draft',
            'items' => [
                ['product_id' => $products['walton_fridge']->id, 'quantity' => 1, 'unit_price' => 40000],
                ['product_id' => $products['vision_fan']->id, 'quantity' => 2, 'unit_price' => 1800],
            ],
        ]);
        $this->confirmSaleWithSerials($s3, $confirmSale, [['account_id' => $accounts['bkash']->id, 'amount' => 43600]]);

        // S4 — Sultana Akter: fully due at confirm, partially paid later.
        $s4 = $createSale->execute([
            'customer_id' => $sultana->id,
            'sale_date' => Carbon::today()->subDays(6)->toDateString(),
            'status' => 'draft',
            'items' => [
                ['product_id' => $products['lg_fridge']->id, 'quantity' => 1, 'unit_price' => 68000],
                ['product_id' => $products['walton_microwave']->id, 'quantity' => 1, 'unit_price' => 11000],
            ],
        ]);
        $this->confirmSaleWithSerials($s4, $confirmSale, []);
        $addPayment->execute($s4->fresh(), [['account_id' => $accounts['bank']->id, 'amount' => 40000]]);

        // S5 — Jashim Uddin: fully paid via Cash.
        $s5 = $createSale->execute([
            'customer_id' => $jashim->id,
            'sale_date' => Carbon::today()->subDays(5)->toDateString(),
            'status' => 'draft',
            'items' => [
                ['product_id' => $products['walton_tv']->id, 'quantity' => 1, 'unit_price' => 19500],
                ['product_id' => $products['vision_wm']->id, 'quantity' => 1, 'unit_price' => 28000, 'installation_required' => true, 'installation_charge' => 500],
            ],
        ]);
        $this->confirmSaleWithSerials($s5, $confirmSale, [['account_id' => $accounts['cash']->id, 'amount' => 47500]]);

        // S6 — Historical/imported record: no stock/ledger/account effect.
        $s6 = $createSale->execute([
            'customer_id' => $karim->id,
            'sale_date' => Carbon::today()->subDays(4)->toDateString(),
            'status' => 'draft',
            'source' => 'imported',
            'items' => [
                ['product_id' => $products['vision_fan']->id, 'quantity' => 3, 'unit_price' => 1800],
            ],
        ]);
        $confirmSale->execute($s6);

        // S7 — Rahima Begum: confirmed then cancelled (the Undo flow).
        $s7 = $createSale->execute([
            'customer_id' => $rahima->id,
            'sale_date' => Carbon::today()->subDays(3)->toDateString(),
            'status' => 'draft',
            'items' => [
                ['product_id' => $products['samsung_ac']->id, 'quantity' => 1, 'unit_price' => 50000],
            ],
        ]);
        $this->confirmSaleWithSerials($s7, $confirmSale, [['account_id' => $accounts['cash']->id, 'amount' => 50000]]);
        $cancelSale->execute($s7->fresh());

        // S8 — Mizanur Rahman: fully paid via bKash, then one item returned and refunded.
        $s8 = $createSale->execute([
            'customer_id' => $mizan->id,
            'sale_date' => Carbon::today()->subDays(2)->toDateString(),
            'status' => 'draft',
            'items' => [
                ['product_id' => $products['singer_rice_cooker']->id, 'quantity' => 2, 'unit_price' => 2500],
                ['product_id' => $products['vision_fan']->id, 'quantity' => 1, 'unit_price' => 1800],
            ],
        ]);
        $this->confirmSaleWithSerials($s8, $confirmSale, [['account_id' => $accounts['bkash']->id, 'amount' => 6800]]);

        $riceCookerItem = $s8->fresh()->items()->where('product_id', $products['singer_rice_cooker']->id)->firstOrFail();
        $return = $createReturn->execute([
            'sale_id' => $s8->id,
            'return_date' => Carbon::today()->subDay()->toDateString(),
            'reason' => 'Customer changed mind, unused',
            'items' => [['sale_item_id' => $riceCookerItem->id, 'quantity' => 1]],
        ]);
        $refundReturn->execute($return, [['account_id' => $accounts['bkash']->id, 'amount' => 2500]]);

        // S9 — Jashim Uddin: EMI sale, down payment via Bank then 3 monthly
        // installments — first already paid, second past its due date (the
        // emi:mark-overdue sweep at the end of run() flips it to overdue),
        // third still pending.
        $s9 = $createSale->execute([
            'customer_id' => $jashim->id,
            'sale_date' => Carbon::today()->subDays(75)->toDateString(),
            'status' => 'draft',
            'financing_type' => 'emi',
            'installment_count' => 3,
            'items' => [
                ['product_id' => $products['lg_fridge']->id, 'quantity' => 1, 'unit_price' => 68000],
            ],
        ]);
        $this->confirmSaleWithSerials($s9, $confirmSale, [['account_id' => $accounts['bank']->id, 'amount' => 8000]]);
        $firstInstallment = EmiInstallment::where('sale_id', $s9->id)->where('installment_number', 1)->firstOrFail();
        $payEmiInstallment->execute($firstInstallment, $accounts['bank']->id, $firstInstallment->amount);
    }

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function confirmSaleWithSerials(Sale $sale, ConfirmSaleAction $confirmSale, array $payments): void
    {
        $sale->load('items.product');
        $serialSelections = [];

        foreach ($sale->items as $item) {
            if ($item->product->track_serial_number) {
                $serialSelections[$item->id] = $this->pickInStockSerials($item->product, (int) $item->quantity);
            }
        }

        $confirmSale->execute($sale, $payments, $serialSelections);
    }

    /**
     * @param  array{customers: array<int, Contact>, suppliers: array<string, Contact>}  $contacts
     * @param  array<string, Product>  $products
     * @param  array<string, Account>  $accounts
     */
    private function seedSalesOrders(array $contacts, array $products, array $accounts): void
    {
        $createOrder = app(CreateSalesOrderAction::class);
        $convertOrder = app(ConvertSalesOrderToSaleAction::class);
        [$karim, , , $sultana, $jashim] = $contacts['customers'];

        // SO1 — Jashim Uddin: booked, no advance yet.
        $createOrder->execute([
            'customer_id' => $jashim->id,
            'order_date' => Carbon::today()->subDay()->toDateString(),
            'expected_delivery_date' => Carbon::today()->addDays(5)->toDateString(),
            'items' => [
                ['product_id' => $products['samsung_tv']->id, 'quantity' => 1, 'unit_price' => 35000],
            ],
        ]);

        // SO2 — Sultana Akter: advance taken, still awaiting fulfillment.
        $createOrder->execute([
            'customer_id' => $sultana->id,
            'order_date' => Carbon::today()->subDays(2)->toDateString(),
            'expected_delivery_date' => Carbon::today()->addDays(7)->toDateString(),
            'items' => [
                ['product_id' => $products['lg_fridge']->id, 'quantity' => 1, 'unit_price' => 68000],
            ],
            'payments' => [['account_id' => $accounts['cash']->id, 'amount' => 20000]],
        ]);

        // SO3 — Abdul Karim: advance taken, then fulfilled (converted to a real Sale).
        $so3 = $createOrder->execute([
            'customer_id' => $karim->id,
            'order_date' => Carbon::today()->subDays(4)->toDateString(),
            'expected_delivery_date' => Carbon::today()->toDateString(),
            'items' => [
                ['product_id' => $products['walton_ac']->id, 'quantity' => 1, 'unit_price' => 46000],
            ],
            'payments' => [['account_id' => $accounts['bank']->id, 'amount' => 20000]],
        ]);
        $convertOrder->execute($so3->fresh(), [['account_id' => $accounts['bank']->id, 'amount' => 26000]]);
    }

    /**
     * @param  array{customers: array<int, Contact>, suppliers: array<string, Contact>}  $contacts
     * @param  array<string, Account>  $accounts
     */
    private function seedExpenses(array $contacts, array $accounts): void
    {
        $createCategory = app(CreateExpenseCategoryAction::class);
        $createExpense = app(CreateExpenseAction::class);
        $addPayment = app(AddExpensePaymentAction::class);
        $suppliers = $contacts['suppliers'];

        $categories = collect(['Room Rent', 'Electricity Bill', 'Staff Salary', 'Transport', 'Internet Bill'])
            ->mapWithKeys(fn (string $name) => [$name => $createCategory->execute(['name' => $name])]);

        // Room Rent — this month, paid in full.
        $rent1 = $createExpense->execute([
            'expense_category_id' => $categories['Room Rent']->id,
            'contact_id' => $suppliers['landlord']->id,
            'total_amount' => 15000,
            'expense_date' => Carbon::today()->subDays(25)->toDateString(),
        ]);
        $addPayment->execute($rent1, [['account_id' => $accounts['bank']->id, 'amount' => 15000]]);

        // Electricity Bill — partially paid.
        $electricity = $createExpense->execute([
            'expense_category_id' => $categories['Electricity Bill']->id,
            'contact_id' => $suppliers['desco']->id,
            'total_amount' => 4500,
            'expense_date' => Carbon::today()->subDays(10)->toDateString(),
        ]);
        $addPayment->execute($electricity, [['account_id' => $accounts['cash']->id, 'amount' => 2000]]);

        // Staff Salary — accrued, fully due.
        $createExpense->execute([
            'expense_category_id' => $categories['Staff Salary']->id,
            'total_amount' => 45000,
            'expense_date' => Carbon::today()->subDays(5)->toDateString(),
            'note' => 'Monthly salary — 2 staff',
        ]);

        // Transport — small, paid immediately.
        $transport = $createExpense->execute([
            'expense_category_id' => $categories['Transport']->id,
            'total_amount' => 1200,
            'expense_date' => Carbon::today()->subDays(3)->toDateString(),
        ]);
        $addPayment->execute($transport, [['account_id' => $accounts['cash']->id, 'amount' => 1200]]);

        // Internet Bill — fully due.
        $createExpense->execute([
            'expense_category_id' => $categories['Internet Bill']->id,
            'total_amount' => 2000,
            'expense_date' => Carbon::today()->subDays(2)->toDateString(),
        ]);

        // Room Rent — next month's row (recurring = a new row each period, never edited into the last one).
        $createExpense->execute([
            'expense_category_id' => $categories['Room Rent']->id,
            'contact_id' => $suppliers['landlord']->id,
            'total_amount' => 15000,
            'expense_date' => Carbon::today()->addDays(5)->toDateString(),
        ]);
    }

    /**
     * @param  array<string, Account>  $accounts
     */
    private function seedCashBookAndTransfer(array $accounts): void
    {
        app(FundTransferAction::class)->execute(
            $accounts['bank'],
            $accounts['cash'],
            30000,
            Carbon::today()->subDays(1),
            'Cash replenishment for shop floor',
        );

        $recordEntry = app(RecordCashBookEntryAction::class);
        $miscCategories = MiscTransactionCategory::query()->pluck('id', 'name');

        $recordEntry->execute(['type' => 'opening_balance', 'amount' => 5000, 'entry_date' => Carbon::today()->subDays(30)->toDateString()]);
        $recordEntry->execute(['type' => 'income', 'category_id' => $miscCategories['Extra Income'], 'amount' => 800, 'note' => 'Scrap sale', 'entry_date' => Carbon::today()->subDays(6)->toDateString()]);
        $recordEntry->execute(['type' => 'expense', 'category_id' => $miscCategories['Conveyance'], 'amount' => 150, 'entry_date' => Carbon::today()->subDays(4)->toDateString()]);
        $recordEntry->execute(['type' => 'expense', 'category_id' => $miscCategories['Lunch/Nasta'], 'amount' => 350, 'entry_date' => Carbon::today()->subDays(3)->toDateString()]);
        $recordEntry->execute(['type' => 'expense', 'category_id' => $miscCategories['Tips'], 'amount' => 100, 'entry_date' => Carbon::today()->subDay()->toDateString()]);
    }

    /**
     * @param  array<string, Account>  $accounts
     */
    private function seedAssets(array $accounts): void
    {
        $createAsset = app(CreateAssetAction::class);
        $addTransaction = app(AddAssetTransactionAction::class);

        // Shop Refrigerator — opening value, then an addition (AC installed).
        $fridge = $createAsset->execute([
            'name' => 'Shop Refrigerator',
            'category' => 'Equipment',
            'purchase_date' => Carbon::today()->subYear()->toDateString(),
            'opening_value' => 15000,
        ]);
        $addTransaction->execute($fridge, ['type' => 'addition', 'amount' => 3000, 'account_id' => $accounts['cash']->id, 'note' => 'Installed a small AC unit']);

        // Delivery Van — opening value only, still in use.
        $createAsset->execute([
            'name' => 'Delivery Van',
            'category' => 'Vehicle',
            'purchase_date' => Carbon::today()->subYears(2)->toDateString(),
            'opening_value' => 500000,
        ]);

        // Old Display Rack — sold at a gain over its book value.
        $rack = $createAsset->execute([
            'name' => 'Old Display Rack',
            'category' => 'Furniture',
            'purchase_date' => Carbon::today()->subYears(3)->toDateString(),
            'opening_value' => 5000,
        ]);
        $addTransaction->execute($rack->fresh(), ['type' => 'sold', 'sale_price' => 6000, 'account_id' => $accounts['cash']->id, 'note' => 'Replaced with a new rack']);
    }

    /**
     * @param  array<string, Account>  $accounts
     */
    private function seedCompanyLoan(array $accounts): void
    {
        $loan = CompanyLoan::create([
            'lender_name' => 'City Bank Ltd',
            'loan_amount' => 200000,
            'interest_rate' => 9,
            'start_date' => Carbon::today()->subMonths(4)->toDateString(),
        ]);

        $addTransaction = app(AddLoanTransactionAction::class);
        $addTransaction->execute($loan, ['type' => 'disbursement', 'amount' => 200000, 'account_id' => $accounts['bank']->id]);
        $addTransaction->execute($loan->fresh(), ['type' => 'interest_charge', 'amount' => 5000]);
        $addTransaction->execute($loan->fresh(), ['type' => 'repayment', 'amount' => 30000, 'account_id' => $accounts['bank']->id]);
    }

    /**
     * @param  array<string, Account>  $accounts
     * @return array<string, Investor>
     */
    private function seedInvestors(array $accounts): array
    {
        $addTransaction = app(AddInvestorTransactionAction::class);

        $malek = Investor::create(['name' => 'Abdul Malek']);
        $addTransaction->execute($malek, ['type' => 'investment', 'amount' => 300000, 'account_id' => $accounts['bank']->id]);
        $addTransaction->execute($malek->fresh(), ['type' => 'profit_share', 'amount' => 15000, 'account_id' => $accounts['cash']->id]);

        // A separate investor record for the staff member who has also put
        // capital in — Staff::investor_id links to this (Phase 13's
        // Staff-as-Investor: no new structure, just reuses this module).
        $rafiqul = Investor::create(['name' => 'Rafiqul Islam']);
        $addTransaction->execute($rafiqul, ['type' => 'investment', 'amount' => 50000, 'account_id' => $accounts['bank']->id]);

        return ['malek' => $malek->fresh(), 'rafiqul' => $rafiqul->fresh()];
    }

    /**
     * @param  array<string, Account>  $accounts
     */
    private function seedOtherLiability(array $accounts): void
    {
        $liability = app(CreateOtherLiabilityAction::class)->execute([
            'name' => 'Old Unpaid Tax 2024',
            'opening_amount' => 12000,
        ]);

        app(AddOtherLiabilityTransactionAction::class)->execute($liability->fresh(), [
            'type' => 'payment',
            'amount' => 5000,
            'account_id' => $accounts['cash']->id,
        ]);
    }

    /**
     * @param  array<string, Account>  $accounts
     * @param  array<string, Investor>  $investors
     */
    private function seedStaff(array $accounts, array $investors): void
    {
        $addTransaction = app(AddStaffTransactionAction::class);
        $types = StaffTransactionType::query()->pluck('id', 'name');

        // Rafiqul Islam — also an investor (see seedInvestors); two months
        // salary charged, one paid, plus an advance, leaving a due balance.
        $rafiqul = Staff::factory()->create([
            'name' => 'Rafiqul Islam',
            'designation' => 'Sales Executive',
            'joining_date' => Carbon::today()->subMonths(6)->toDateString(),
            'salary_amount' => 18000,
            'investor_id' => $investors['rafiqul']->id,
        ]);
        $addTransaction->execute($rafiqul, ['staff_transaction_type_id' => $types['Salary Charge'], 'amount' => 18000]);
        $addTransaction->execute($rafiqul->fresh(), ['staff_transaction_type_id' => $types['Salary Charge'], 'amount' => 18000]);
        $addTransaction->execute($rafiqul->fresh(), ['staff_transaction_type_id' => $types['Salary Payment'], 'amount' => 18000, 'account_id' => $accounts['bank']->id]);
        $addTransaction->execute($rafiqul->fresh(), ['staff_transaction_type_id' => $types['Advance Given'], 'amount' => 3000, 'account_id' => $accounts['cash']->id]);

        // Nasrin Akter — fully settled salary, then a small loan.
        $nasrin = Staff::factory()->create([
            'name' => 'Nasrin Akter',
            'designation' => 'Cashier',
            'joining_date' => Carbon::today()->subMonths(3)->toDateString(),
            'salary_amount' => 15000,
        ]);
        $addTransaction->execute($nasrin, ['staff_transaction_type_id' => $types['Salary Charge'], 'amount' => 15000]);
        $addTransaction->execute($nasrin->fresh(), ['staff_transaction_type_id' => $types['Salary Payment'], 'amount' => 15000, 'account_id' => $accounts['cash']->id]);
        $addTransaction->execute($nasrin->fresh(), ['staff_transaction_type_id' => $types['Loan Given'], 'amount' => 5000, 'account_id' => $accounts['bank']->id]);
    }
}
