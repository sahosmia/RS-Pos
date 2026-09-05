<?php

use App\Actions\SalesOrder\ConvertSalesOrderToSaleAction;
use App\Actions\SalesOrder\CreateSalesOrderAction;
use App\Enums\SalesOrderStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('creating a sales order with no advance takes no money or ledger action', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create(['balance' => 0]);
    $product = Product::factory()->create(['selling_price' => 500]);

    $order = app(CreateSalesOrderAction::class)->execute([
        'customer_id' => $customer->id,
        'order_date' => '2026-03-05',
        'items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 500]],
    ]);

    expect($order->status)->toBe(SalesOrderStatus::Pending)
        ->and($order->total_amount)->toBe(1000.0)
        ->and($order->advance_paid)->toBe(0.0)
        ->and($customer->fresh()->balance)->toBe(0.0)
        ->and($product->fresh()->current_stock)->toBe(0.0);
});

test('an advance payment moves the account and customer balance and posts a balanced journal entry', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create(['balance' => 0]);
    $product = Product::factory()->create(['selling_price' => 500]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);

    $order = app(CreateSalesOrderAction::class)->execute([
        'customer_id' => $customer->id,
        'order_date' => '2026-03-05',
        'items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 500]],
        'payments' => [['account_id' => $account->id, 'amount' => 300]],
    ]);

    expect($order->status)->toBe(SalesOrderStatus::Partial)
        ->and($order->advance_paid)->toBe(300.0)
        ->and($account->fresh()->current_balance)->toBe(300.0)
        // Company now owes the customer — negative per the balance sign convention.
        ->and($customer->fresh()->balance)->toBe(-300.0);

    $entry = JournalEntry::where('reference_type', 'sales_order')->where('reference_id', $order->id)->firstOrFail();
    $customerAdvances = ChartOfAccount::where('code', '2150')->firstOrFail();

    expect($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and($customerAdvances->fresh()->balance)->toBe(300.0);
});

test('converting a sales order to a sale carries the advance into paid_amount without re-touching cash or the ledger', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create(['balance' => 0]);
    $product = Product::factory()->create(['selling_price' => 500, 'current_stock' => 5, 'avg_cost' => 300]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);

    $order = app(CreateSalesOrderAction::class)->execute([
        'customer_id' => $customer->id,
        'order_date' => '2026-03-05',
        'items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 500]],
        'payments' => [['account_id' => $account->id, 'amount' => 300]],
    ]);

    $sale = app(ConvertSalesOrderToSaleAction::class)->execute($order);

    expect($sale->sales_order_id)->toBe($order->id)
        ->and($sale->total_amount)->toBe(1000.0)
        ->and($sale->paid_amount)->toBe(300.0)
        ->and($sale->due_amount)->toBe(700.0)
        ->and($product->fresh()->current_stock)->toBe(3.0)
        ->and($account->fresh()->current_balance)->toBe(300.0)
        // Advance credit (-300) plus the new sale invoice (+1000) nets to the true remaining due.
        ->and($customer->fresh()->balance)->toBe(700.0)
        ->and($order->fresh()->status)->toBe(SalesOrderStatus::Completed);
});

test('converting an already-completed sales order is a no-op that returns the same sale', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 500, 'current_stock' => 5]);

    $order = app(CreateSalesOrderAction::class)->execute([
        'customer_id' => $customer->id,
        'order_date' => '2026-03-05',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500]],
    ]);

    $firstSale = app(ConvertSalesOrderToSaleAction::class)->execute($order);
    $secondSale = app(ConvertSalesOrderToSaleAction::class)->execute($order->fresh());

    expect($secondSale->id)->toBe($firstSale->id)
        ->and($product->fresh()->current_stock)->toBe(4.0);
});

test('sales order pages render', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 500]);

    $order = app(CreateSalesOrderAction::class)->execute([
        'customer_id' => $customer->id,
        'order_date' => '2026-03-05',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500]],
    ]);

    $this->get('/sales-orders')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales-orders/index')->has('orders.data', 1));

    $this->get('/sales-orders/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales-orders/create'));

    $this->get("/sales-orders/{$order->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales-orders/show')->where('order.order_no', $order->order_no));
});
