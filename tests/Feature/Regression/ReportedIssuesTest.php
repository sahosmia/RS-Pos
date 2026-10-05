<?php

use App\Actions\Sales\SaleReturn\CreateSaleReturnAction;
use App\Enums\EmiInstallmentStatus;
use App\Enums\PurchaseStatus;
use App\Enums\SalePaymentType;
use App\Enums\SaleStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\EmiInstallment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('issue 1: sale payment cannot exceed due amount', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $customer = Contact::factory()->create();
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 10000]);

    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $product = Product::factory()->create(['selling_price' => 1000, 'current_stock' => 10]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 1000, 'original_price' => 1000, 'subtotal' => 2000]);
    $sale->forceFill(['total_amount' => 2000, 'due_amount' => 2000, 'status' => SaleStatus::Confirmed])->save();

    // Try paying 2500 on a 2000 due sale
    $response = $this->post("/sales/{$sale->id}/payments", [
        'payments' => [['account_id' => $account->id, 'amount' => 2500]],
    ]);

    $response->assertSessionHasErrors(['payments']);
    expect($sale->fresh()->due_amount)->toBe(2000.0);
});

test('issue 1: purchase payment cannot exceed due amount', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $supplier = Contact::factory()->supplier()->create();
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 10000]);

    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $product = Product::factory()->create(['current_stock' => 0]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 1000, 'original_price' => 1000, 'subtotal' => 2000]);
    $purchase->forceFill(['total_amount' => 2000, 'due_amount' => 2000, 'status' => PurchaseStatus::Received])->save();

    // Try paying 2500 on a 2000 due purchase
    $response = $this->post("/purchases/{$purchase->id}/payments", [
        'payments' => [['account_id' => $account->id, 'amount' => 2500]],
    ]);

    $response->assertSessionHasErrors(['payments']);
    expect($purchase->fresh()->due_amount)->toBe(2000.0);
});

test('issue 1: contact payment targeting a sale cannot exceed due amount', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $customer = Contact::factory()->create();
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 10000]);

    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $product = Product::factory()->create(['selling_price' => 1000, 'current_stock' => 10]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000, 'original_price' => 1000, 'subtotal' => 1000]);
    $sale->forceFill(['total_amount' => 1000, 'due_amount' => 1000, 'status' => SaleStatus::Confirmed])->save();

    $response = $this->post("/contacts/{$customer->id}/payments", [
        'account_id' => $account->id,
        'amount' => 1500,
        'direction' => 'received',
        'sale_id' => $sale->id,
    ]);

    $response->assertSessionHasErrors(['amount']);
    expect($sale->fresh()->due_amount)->toBe(1000.0);
});

test('issue 2 & 3: EMI installment supports partial payment and rejects overpayment', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $customer = Contact::factory()->create();
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 10000]);

    $sale = Sale::factory()->create([
        'customer_id' => $customer->id,
        'status' => SaleStatus::Confirmed,
        'financing_type' => SalePaymentType::Emi,
        'installment_count' => 2,
    ]);

    $installment = EmiInstallment::create([
        'sale_id' => $sale->id,
        'installment_number' => 1,
        'due_date' => now()->addMonth(),
        'amount' => 1000,
        'paid_amount' => 0,
        'status' => EmiInstallmentStatus::Pending,
    ]);

    // Pay partial 400
    $this->post("/emi-installments/{$installment->id}/pay", [
        'account_id' => $account->id,
        'amount' => 400,
    ])->assertRedirect();

    $installment = $installment->fresh();
    expect($installment->paid_amount)->toBe(400.0)
        ->and($installment->status)->toBe(EmiInstallmentStatus::Pending);

    // Try paying 700 (which exceeds remaining 600)
    $this->post("/emi-installments/{$installment->id}/pay", [
        'account_id' => $account->id,
        'amount' => 700,
    ])->assertSessionHasErrors(['amount']);

    // Pay remaining 600
    $this->post("/emi-installments/{$installment->id}/pay", [
        'account_id' => $account->id,
        'amount' => 600,
    ])->assertRedirect();

    $installment = $installment->fresh();
    expect($installment->paid_amount)->toBe(1000.0)
        ->and($installment->status)->toBe(EmiInstallmentStatus::Paid);

    // Further payment attempt on paid installment fails
    $this->post("/emi-installments/{$installment->id}/pay", [
        'account_id' => $account->id,
        'amount' => 100,
    ])->assertSessionHasErrors(['amount']);
});

test('issue 4: cancelling a received purchase reverses stock, ledger, account, and GL', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 10000]);

    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 500]);
    $purchase->forceFill(['total_amount' => 500, 'due_amount' => 500])->save();

    // Receive purchase with payment of 200
    $this->post("/purchases/{$purchase->id}/confirm", [
        'payments' => [['account_id' => $account->id, 'amount' => 200]],
    ])->assertRedirect();

    expect($product->fresh()->current_stock)->toBe(5.0)
        ->and($account->fresh()->current_balance)->toBe(9800.0)
        ->and($purchase->fresh()->status)->toBe(PurchaseStatus::Received);

    // Cancel purchase
    $this->post("/purchases/{$purchase->id}/cancel")->assertRedirect();

    $purchase = $purchase->fresh();
    expect($purchase->status)->toBe(PurchaseStatus::Cancelled)
        ->and($product->fresh()->current_stock)->toBe(0.0)
        ->and($account->fresh()->current_balance)->toBe(10000.0);
});

test('issue 5: sale return calculates refund net of invoice-level discount', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 100, 'current_stock' => 10, 'avg_cost' => 50]);

    $sale = Sale::factory()->create([
        'customer_id' => $customer->id,
        'discount_type' => 'flat',
        'discount_value' => 20,
        'status' => SaleStatus::Confirmed,
    ]);

    // 2 items @ 100 = 200 subtotal, minus 20 flat discount = 180 total
    $item = $sale->items()->create([
        'product_id' => $product->id,
        'quantity' => 2,
        'original_price' => 100,
        'unit_price' => 100,
        'subtotal' => 200,
    ]);
    $sale->forceFill([
        'subtotal' => 200,
        'discount_amount' => 20,
        'total_amount' => 180,
        'due_amount' => 180,
    ])->save();

    // Return 1 item
    $return = app(CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => now()->toDateString(),
        'items' => [
            ['sale_item_id' => $item->id, 'quantity' => 1],
        ],
    ]);

    // Expected return total: $100 subtotal - ($100 * 20/200) discount = $90
    expect($return->total_amount)->toBe(90.0);
});

test('issue 6: invalid serial selection throws clean validation error instead of 500 crash', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 100, 'current_stock' => 1, 'track_serial_number' => true]);

    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $saleItem = $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 100]);
    $sale->forceFill(['total_amount' => 100, 'due_amount' => 100])->save();

    // Post confirm with invalid serial number
    $response = $this->post("/sales/{$sale->id}/confirm", [
        'serial_numbers' => [$saleItem->id => ['INVALID-SN-999']],
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['error']);
});
