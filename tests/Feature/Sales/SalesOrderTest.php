<?php

use App\Actions\Sales\SalesOrder\ConvertSalesOrderToSaleAction;
use App\Actions\Sales\SalesOrder\CreateSalesOrderAction;
use App\Enums\SalesOrderStatus;
use App\Enums\SerialNumberStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SalesOrder;
use App\Models\SerialNumber;
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

test('converting a sales order clears the advance from Customer Advances and leaves Accounts Receivable at the true remaining due', function () {
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

    app(ConvertSalesOrderToSaleAction::class)->execute($order);

    $receivable = ChartOfAccount::where('code', '1100')->firstOrFail();
    $customerAdvances = ChartOfAccount::where('code', '2150')->firstOrFail();

    expect($receivable->fresh()->balance)->toBe(700.0)
        ->and($customerAdvances->fresh()->balance)->toBe(0.0);
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
        ->assertInertia(fn ($page) => $page->component('sales/sales-orders/index')->has('orders.data', 1));

    // There is no separate order form: orders are booked from the Add Sale form.
    $this->get('/sales-orders/create')->assertRedirect(route('sales.create'));

    $this->get("/sales-orders/{$order->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales/sales-orders/show')->where('order.order_no', $order->order_no));
});

test('an order keeps discounts, installation, warranty, serials and EMI terms, and the converted sale carries every one of them', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create(['balance' => 0]);
    $product = Product::factory()->create(['selling_price' => 1000, 'current_stock' => 1, 'avg_cost' => 600, 'track_serial_number' => true]);
    $serial = SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-777']);

    $this->post('/sales-orders', [
        'customer_id' => $customer->id,
        'order_date' => '2026-03-05',
        'discount_type' => 'flat',
        'discount_value' => 50,
        'financing_type' => 'emi',
        'emi_interest_method' => 'none',
        'emi_annual_rate' => 0,
        'emi_tenure_value' => 6,
        'emi_tenure_unit' => 'months',
        'emi_frequency' => 'monthly',
        'items' => [[
            'product_id' => $product->id,
            'quantity' => 1,
            'original_price' => 1000,
            'unit_price' => 1000,
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'installation_required' => true,
            'installation_charge' => 200,
            'warranty_months' => 18,
            'service_plan_included' => false,
            'serial_numbers' => ['SN-777'],
        ]],
    ])->assertRedirect();

    $order = SalesOrder::query()->firstOrFail();

    // 1000 - 10% = 900 on the line; invoice discount 50 -> 850; installation 200 on top (never discounted) -> 1050.
    expect($order->subtotal)->toBe(900.0)
        ->and($order->discount_amount)->toBe(50.0)
        ->and($order->installation_amount)->toBe(200.0)
        ->and($order->total_amount)->toBe(1050.0)
        ->and($order->financing_type)->toBe('emi')
        ->and($order->installment_count)->toBe(6)
        ->and($order->items()->first()->serial_numbers)->toBe(['SN-777']);

    // Stock and serials are untouched until delivery.
    expect($product->fresh()->current_stock)->toBe(1.0)
        ->and($serial->fresh()->status)->toBe(SerialNumberStatus::InStock);

    $sale = app(ConvertSalesOrderToSaleAction::class)->execute($order);
    $line = $sale->items()->firstOrFail();

    expect($sale->discount_amount)->toBe(50.0)
        ->and($sale->financing_type->value)->toBe('emi')
        ->and($sale->installment_count)->toBe(6)
        ->and($sale->emiInstallments()->count())->toBe(6)
        ->and($line->unit_price)->toBe(900.0)
        ->and($line->discount_amount)->toBe(100.0)
        ->and($line->installation_required)->toBeTrue()
        ->and($line->installation_charge)->toBe(200.0)
        ->and($line->warranty_months)->toBe(18)
        ->and($line->service_plan_included)->toBeFalse()
        ->and($serial->fresh()->status)->toBe(SerialNumberStatus::Sold)
        ->and($product->fresh()->current_stock)->toBe(0.0);
});

test('a planned serial that is not in stock stops the conversion and nothing is half-converted', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 100, 'current_stock' => 1, 'track_serial_number' => true]);

    $order = app(CreateSalesOrderAction::class)->execute([
        'customer_id' => $customer->id,
        'order_date' => '2026-03-05',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'serial_numbers' => ['NOPE']]],
    ]);

    expect(fn () => app(ConvertSalesOrderToSaleAction::class)->execute($order))->toThrow(Exception::class);

    expect($order->fresh()->status)->toBe(SalesOrderStatus::Pending)
        ->and(Sale::query()->count())->toBe(0);
});

test('an order saved without any stock or serial is accepted — nothing is checked until it is confirmed', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 100, 'current_stock' => 0, 'track_serial_number' => true]);

    $this->post('/sales-orders', [
        'customer_id' => $customer->id,
        'order_date' => '2026-03-05',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100]],
    ])->assertRedirect();

    expect(SalesOrder::query()->count())->toBe(1)
        ->and($product->fresh()->current_stock)->toBe(0.0);
});

test('the open list hides confirmed orders unless a status is chosen', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    SalesOrder::factory()->create(['customer_id' => $customer->id, 'status' => SalesOrderStatus::Pending]);
    SalesOrder::factory()->create(['customer_id' => $customer->id, 'status' => SalesOrderStatus::Completed]);

    $this->get('/sales-orders')->assertInertia(fn ($page) => $page->has('orders.data', 1)->where('filters.status', 'open'));
    $this->get('/sales-orders?status=all')->assertInertia(fn ($page) => $page->has('orders.data', 2));
    $this->get('/sales-orders?status=completed')->assertInertia(fn ($page) => $page->has('orders.data', 1));
});

test('confirming opens the order in the sale form, and what is edited there is what gets sold', function () {
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

    $this->get("/sales-orders/{$order->id}/confirm")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sales/sales-orders/confirm')
            ->where('order.advance_paid', 300)
            ->where('sale.items.0.quantity', 2));

    // The customer changed their mind: 3 pieces at a lower price, and pays 200 more now.
    $this->post("/sales-orders/{$order->id}/convert", [
        'sale_date' => '2026-03-10',
        'items' => [['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 450]],
        'payments' => [['account_id' => $account->id, 'amount' => 200]],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();

    expect($sale->total_amount)->toBe(1350.0)
        ->and($sale->paid_amount)->toBe(500.0)
        ->and($sale->due_amount)->toBe(850.0)
        ->and($sale->sales_order_id)->toBe($order->id)
        ->and($product->fresh()->current_stock)->toBe(2.0)
        ->and($order->fresh()->status)->toBe(SalesOrderStatus::Completed);

    // Once confirmed it can no longer be confirmed again and it leaves the open list.
    $this->get("/sales-orders/{$order->id}/confirm")->assertRedirect();
    $this->get('/sales-orders')->assertInertia(fn ($page) => $page->has('orders.data', 0));
});

test('the dashboard shows the waiting sales orders card only while some are open', function () {
    $user = userWithPermissions(['sale.view_all']);
    $this->actingAs($user);
    $customer = Contact::factory()->create();

    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('salesOrders', null));

    SalesOrder::factory()->create(['customer_id' => $customer->id, 'status' => SalesOrderStatus::Pending, 'total_amount' => 900]);

    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('salesOrders.count', 1)->where('salesOrders.total', 900));
});
