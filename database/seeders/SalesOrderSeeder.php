<?php

namespace Database\Seeders;

use App\Actions\Sales\SalesOrder\ConvertSalesOrderToSaleAction;
use App\Actions\Sales\SalesOrder\CreateSalesOrderAction;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\SalesOrder;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo sales orders — one with no advance, one with an advance awaiting
 * fulfillment, one fulfilled (converted into a real sale). Seeds once:
 * skipped if any sales order already exists.
 */
class SalesOrderSeeder extends Seeder
{
    public function run(): void
    {
        if (SalesOrder::query()->exists()) {
            $this->command?->warn('Sales orders already exist — skipping SalesOrderSeeder.');

            return;
        }

        // Settings holds the order/invoice-number counters (find-or-create — never overwrites yours).
        $this->call([SettingsSeeder::class, AccountSeeder::class, ProductSeeder::class, CustomerSeeder::class]);

        $this->seedSalesOrders(['customers' => DemoLookup::customers(), 'suppliers' => []], DemoLookup::products(), DemoLookup::accounts());
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
}
