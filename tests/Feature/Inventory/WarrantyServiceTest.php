<?php

use App\Actions\Products\ServiceRequest\CreateServiceRequestAction;
use App\Actions\Sales\Sale\ConfirmSaleAction;
use App\Actions\Sales\Sale\CreateSaleAction;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItemServicePeriod;
use App\Models\ServicePlanTemplate;
use App\Models\Settings;
use App\Models\User;
use App\Models\WarrantyClaim;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Settings::factory()->create();
});

function confirmedSaleWithItem(Contact $customer, Product $product, bool $installationRequired = false, ?float $installationCharge = null): Sale
{
    $sale = app(CreateSaleAction::class)->execute([
        'customer_id' => $customer->id,
        'sale_date' => Carbon::today()->toDateString(),
        'status' => 'draft',
        'items' => [[
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => $product->selling_price,
            'installation_required' => $installationRequired,
            'installation_charge' => $installationCharge,
        ]],
    ]);

    return app(ConfirmSaleAction::class)->execute($sale);
}

test('confirming a sale snapshots the product service plan into sale_item_service_periods', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['has_installation_service' => true, 'current_stock' => 10]);
    ServicePlanTemplate::factory()->create(['product_id' => $product->id, 'period_number' => 1, 'period_months' => 12, 'free_quota' => 2]);
    ServicePlanTemplate::factory()->create(['product_id' => $product->id, 'period_number' => 2, 'period_months' => 12, 'free_quota' => 0]);

    $sale = confirmedSaleWithItem($customer, $product);
    $item = $sale->items()->firstOrFail();

    $periods = SaleItemServicePeriod::where('sale_item_id', $item->id)->orderBy('period_number')->get();

    expect($periods)->toHaveCount(2)
        ->and($periods[0]->period_start_date->toDateString())->toBe(Carbon::today()->toDateString())
        ->and($periods[0]->period_end_date->toDateString())->toBe(Carbon::today()->addMonths(12)->toDateString())
        ->and($periods[1]->period_start_date->toDateString())->toBe(Carbon::today()->addMonths(12)->toDateString())
        ->and($periods[1]->free_quota)->toBe(0);
});

test('confirming a sale with installation required auto-creates a completed, non-free service request', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['has_installation_service' => true, 'current_stock' => 10]);

    $sale = confirmedSaleWithItem($customer, $product, true, 500);
    $item = $sale->items()->firstOrFail();

    $request = $item->serviceRequests()->firstOrFail();

    expect($request->type->value)->toBe('installation')
        ->and($request->is_free)->toBeFalse()
        ->and($request->charge_amount)->toBe(500.0)
        ->and($request->status->value)->toBe('completed');
});

test('a service request within the free quota is free and posts no journal entry', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['has_installation_service' => true, 'current_stock' => 10]);
    ServicePlanTemplate::factory()->create(['product_id' => $product->id, 'period_number' => 1, 'period_months' => 12, 'free_quota' => 1]);

    $sale = confirmedSaleWithItem($customer, $product);
    $item = $sale->items()->firstOrFail();

    $serviceRequest = app(CreateServiceRequestAction::class)->execute([
        'sale_item_id' => $item->id,
        'request_date' => Carbon::today()->toDateString(),
    ]);

    expect($serviceRequest->is_free)->toBeTrue()
        ->and($serviceRequest->charge_amount)->toBe(0.0)
        ->and(JournalEntry::where('reference_type', 'service_request')->where('reference_id', $serviceRequest->id)->exists())->toBeFalse();
});

test('a second service request beyond the free quota is paid and posts a balanced journal entry', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['has_installation_service' => true, 'current_stock' => 10]);
    ServicePlanTemplate::factory()->create(['product_id' => $product->id, 'period_number' => 1, 'period_months' => 12, 'free_quota' => 1]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);

    $sale = confirmedSaleWithItem($customer, $product);
    $item = $sale->items()->firstOrFail();

    app(CreateServiceRequestAction::class)->execute(['sale_item_id' => $item->id, 'request_date' => Carbon::today()->toDateString()]);

    $second = app(CreateServiceRequestAction::class)->execute([
        'sale_item_id' => $item->id,
        'request_date' => Carbon::today()->toDateString(),
        'charge_amount' => 300,
        'account_id' => $account->id,
    ]);

    $income = ChartOfAccount::where('code', '4200')->firstOrFail();
    $entry = JournalEntry::where('reference_type', 'service_request')->where('reference_id', $second->id)->firstOrFail();

    expect($second->is_free)->toBeFalse()
        ->and($second->charge_amount)->toBe(300.0)
        ->and($account->fresh()->current_balance)->toBe(300.0)
        ->and($income->fresh()->balance)->toBe(300.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('a service request after the whole plan has lapsed is always paid', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['has_installation_service' => true, 'current_stock' => 10]);
    ServicePlanTemplate::factory()->create(['product_id' => $product->id, 'period_number' => 1, 'period_months' => 1, 'free_quota' => 5]);

    $sale = confirmedSaleWithItem($customer, $product);
    $item = $sale->items()->firstOrFail();

    // The only period ended a month ago — no current period covers "today".
    $item->servicePeriods()->update([
        'period_start_date' => Carbon::today()->subMonths(2),
        'period_end_date' => Carbon::today()->subMonth(),
    ]);

    expect($item->fresh()->isNextServiceFree())->toBeFalse();
});

test('warranty claim create and update endpoints work', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 10]);
    $sale = confirmedSaleWithItem($customer, $product);
    $item = $sale->items()->firstOrFail();

    $this->post(route('warranty-claims.store'), [
        'sale_item_id' => $item->id,
        'claim_date' => Carbon::today()->toDateString(),
        'issue_description' => 'Not cooling properly',
    ])->assertRedirect(route('warranty-claims.index'));

    $claim = WarrantyClaim::where('sale_item_id', $item->id)->firstOrFail();
    expect($claim->status->value)->toBe('pending');

    $this->patch(route('warranty-claims.update', $claim->id), [
        'status' => 'resolved',
        'resolution_note' => 'Gas refilled',
    ])->assertRedirect(route('warranty-claims.index'));

    expect($claim->fresh()->status->value)->toBe('resolved')
        ->and($claim->fresh()->resolution_note)->toBe('Gas refilled');
});

test('the installation charge is billed on top of the goods, outside the invoice discount', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['has_installation_service' => true, 'current_stock' => 10, 'selling_price' => 1000, 'avg_cost' => 600]);

    $sale = app(CreateSaleAction::class)->execute([
        'customer_id' => $customer->id,
        'sale_date' => Carbon::today()->toDateString(),
        'status' => 'draft',
        'discount_type' => 'flat',
        'discount_value' => 100,
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000, 'installation_required' => true, 'installation_charge' => 250]],
    ]);

    // 1000 goods - 100 discount + 250 installation
    expect($sale->subtotal)->toBe(1000.0)
        ->and($sale->discount_amount)->toBe(100.0)
        ->and($sale->installation_amount)->toBe(250.0)
        ->and($sale->total_amount)->toBe(1150.0);

    $confirmed = app(ConfirmSaleAction::class)->execute($sale);

    expect($customer->fresh()->balance)->toBe(1150.0)
        ->and($confirmed->due_amount)->toBe(1150.0);
});

test('an installation that was not asked for adds nothing to the total', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 10, 'selling_price' => 500]);

    $sale = app(CreateSaleAction::class)->execute([
        'customer_id' => $customer->id,
        'sale_date' => Carbon::today()->toDateString(),
        'status' => 'draft',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500, 'installation_required' => false, 'installation_charge' => 300]],
    ]);

    expect($sale->total_amount)->toBe(500.0)->and($sale->installation_amount)->toBe(0.0);
});

test('returning an installed item refunds the goods only — the installation charge stays', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['has_installation_service' => true, 'current_stock' => 10, 'selling_price' => 1000, 'avg_cost' => 600]);

    $sale = confirmedSaleWithItem($customer, $product, true, 250);
    $item = $sale->items()->firstOrFail();

    expect($sale->total_amount)->toBe(1250.0);

    $return = app(App\Actions\Sales\SaleReturn\CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => Carbon::today()->toDateString(),
        'items' => [['sale_item_id' => $item->id, 'quantity' => 1]],
    ]);

    expect($return->total_amount)->toBe(1000.0)
        ->and($customer->fresh()->balance)->toBe(250.0);
});

test('returning an item whose installation never happened refunds the installation charge too', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['has_installation_service' => true, 'current_stock' => 10, 'selling_price' => 1000, 'avg_cost' => 600]);

    $sale = confirmedSaleWithItem($customer, $product, true, 250);
    $item = $sale->items()->firstOrFail();
    $item->serviceRequests()->update(['status' => 'cancelled']);

    $return = app(App\Actions\Sales\SaleReturn\CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => Carbon::today()->toDateString(),
        'items' => [['sale_item_id' => $item->id, 'quantity' => 1]],
    ]);

    expect($return->total_amount)->toBe(1250.0)
        ->and($customer->fresh()->balance)->toBe(0.0);
});
