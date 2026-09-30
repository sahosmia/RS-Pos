<?php

namespace Database\Seeders;

use App\Actions\Sales\Sale\AddSalePaymentAction;
use App\Actions\Sales\Sale\CancelSaleAction;
use App\Actions\Sales\Sale\ConfirmSaleAction;
use App\Actions\Sales\Sale\CreateSaleAction;
use App\Actions\Sales\Sale\PayEmiInstallmentAction;
use App\Actions\Sales\SaleReturn\CreateSaleReturnAction;
use App\Actions\Sales\SaleReturn\RefundSaleReturnAction;
use App\Enums\SerialNumberStatus;
use App\Models\Account;
use App\Models\Contact;
use App\Models\EmiInstallment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SerialNumber;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;

/**
 * Demo sales — paid in cash/bank/bKash, part-paid, an imported historical
 * record, a cancelled (undo) sale, a sale with a refunded return, and an EMI
 * sale. Needs stock, so it seeds the demo purchases first. Seeds once:
 * skipped if the demo scenario is already in the database.
 */
class SaleSeeder extends Seeder
{
    public function run(): void
    {
        if (SaleReturn::query()->where('reason', 'Customer changed mind, unused')->exists()) {
            $this->command?->warn('Demo sales are already seeded — skipping SaleSeeder.');

            return;
        }

        // Settings holds the invoice-number counter (find-or-create — never overwrites yours).
        $this->call([SettingsSeeder::class, AccountSeeder::class, ProductSeeder::class, CustomerSeeder::class, PurchaseSeeder::class]);

        $this->seedSales(['customers' => DemoLookup::customers(), 'suppliers' => []], DemoLookup::products(), DemoLookup::accounts());

        Artisan::call('emi:mark-overdue');
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
}
