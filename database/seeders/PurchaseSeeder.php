<?php

namespace Database\Seeders;

use App\Actions\Purchases\Purchase\AddPurchasePaymentAction;
use App\Actions\Purchases\Purchase\ConfirmPurchaseAction;
use App\Actions\Purchases\Purchase\CreatePurchaseAction;
use App\Actions\Purchases\PurchaseReturn\CreatePurchaseReturnAction;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo purchases from the demo suppliers — one fully paid, one half paid, one
 * received fully due then paid down and partly returned, one paid in cash.
 * Seeds once: skipped if the demo scenario is already in the database.
 */
class PurchaseSeeder extends Seeder
{
    public function run(): void
    {
        if (PurchaseReturn::query()->where('reason', 'Scratched unit found during inspection')->exists()) {
            $this->command?->warn('Demo purchases are already seeded — skipping PurchaseSeeder.');

            return;
        }

        // Settings holds the purchase-number counter (find-or-create — never overwrites yours).
        $this->call([SettingsSeeder::class, AccountSeeder::class, ProductSeeder::class, SupplierSeeder::class]);

        $this->seedPurchases(['customers' => [], 'suppliers' => DemoLookup::suppliers()], DemoLookup::products(), DemoLookup::accounts());
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
}
