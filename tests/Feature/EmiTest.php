<?php

use App\Enums\EmiInstallmentStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\EmiInstallment;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Settings::factory()->create();
});

test('confirming an EMI sale schedules the remaining due across equal monthly installments', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000, 'current_stock' => 10]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'confirmed',
        'financing_type' => 'emi',
        'installment_count' => 3,
        'items' => [
            ['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 1000],
        ],
        'payments' => [['account_id' => $account->id, 'amount' => 900]],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();
    $installments = EmiInstallment::where('sale_id', $sale->id)->orderBy('installment_number')->get();

    // Total 3000, down payment 900 -> due 2100 split across 3 installments = 700 each.
    expect($installments)->toHaveCount(3)
        ->and($installments->sum('amount'))->toBe(2100.0)
        ->and($installments[0]->amount)->toBe(700.0)
        ->and($installments[0]->due_date->toDateString())->toBe('2026-04-01')
        ->and($installments[1]->due_date->toDateString())->toBe('2026-05-01')
        ->and($installments[2]->due_date->toDateString())->toBe('2026-06-01')
        ->and($installments[0]->status)->toBe(EmiInstallmentStatus::Pending);
});

test('the last installment absorbs the rounding remainder so the schedule sums exactly to the due amount', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 100, 'current_stock' => 10]);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'confirmed',
        'financing_type' => 'emi',
        'installment_count' => 3,
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100],
        ],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();
    $installments = EmiInstallment::where('sale_id', $sale->id)->orderBy('installment_number')->get();

    expect($installments->sum('amount'))->toBe(100.0)
        ->and($installments[0]->amount)->toBe(33.33)
        ->and($installments[1]->amount)->toBe(33.33)
        ->and($installments[2]->amount)->toBe(33.34);
});

test('a one-time sale with no installment_count never generates an EMI schedule', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 500, 'current_stock' => 10]);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'confirmed',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500],
        ],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();

    expect(EmiInstallment::where('sale_id', $sale->id)->count())->toBe(0);
});

test('paying an installment posts a balanced journal entry and reduces the sale due amount', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 2100, 'current_stock' => 10]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'confirmed',
        'financing_type' => 'emi',
        'installment_count' => 3,
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 2100],
        ],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();
    expect($sale->due_amount)->toBe(2100.0);

    $installment = EmiInstallment::where('sale_id', $sale->id)->where('installment_number', 1)->firstOrFail();

    $this->post(route('emi-installments.pay', $installment->id), [
        'account_id' => $account->id,
        'amount' => 700,
    ])->assertRedirect();

    $receivable = ChartOfAccount::where('code', '1100')->firstOrFail();
    $entry = JournalEntry::where('reference_type', 'sale')->where('reference_id', $sale->id)->latest('id')->firstOrFail();

    expect($installment->fresh()->status)->toBe(EmiInstallmentStatus::Paid)
        ->and($installment->fresh()->paid_amount)->toBe(700.0)
        ->and($sale->fresh()->due_amount)->toBe(1400.0)
        ->and($account->fresh()->current_balance)->toBe(700.0)
        ->and($customer->fresh()->balance)->toBe(1400.0)
        ->and($receivable->fresh()->balance)->toBe(1400.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('an already-paid installment cannot be paid again', function () {
    $this->actingAs(User::factory()->create());
    $sale = Sale::factory()->confirmed()->create(['customer_id' => Contact::factory()]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);
    $installment = EmiInstallment::factory()->create([
        'sale_id' => $sale->id,
        'amount' => 500,
        'paid_amount' => 500,
        'status' => 'paid',
        'account_id' => $account->id,
    ]);

    $this->post(route('emi-installments.pay', $installment->id), [
        'account_id' => $account->id,
        'amount' => 500,
    ]);

    expect($account->fresh()->current_balance)->toBe(0.0);
});

test('the daily overdue sweep marks only pending installments past their due date', function () {
    $sale = Sale::factory()->confirmed()->create(['customer_id' => Contact::factory()]);
    $past = EmiInstallment::factory()->create(['sale_id' => $sale->id, 'installment_number' => 1, 'due_date' => Carbon::yesterday(), 'status' => 'pending']);
    $future = EmiInstallment::factory()->create(['sale_id' => $sale->id, 'installment_number' => 2, 'due_date' => Carbon::tomorrow(), 'status' => 'pending']);
    $alreadyPaid = EmiInstallment::factory()->create(['sale_id' => $sale->id, 'installment_number' => 3, 'due_date' => Carbon::yesterday(), 'status' => 'paid']);

    $this->artisan('emi:mark-overdue')->assertSuccessful();

    expect($past->fresh()->status)->toBe(EmiInstallmentStatus::Overdue)
        ->and($future->fresh()->status)->toBe(EmiInstallmentStatus::Pending)
        ->and($alreadyPaid->fresh()->status)->toBe(EmiInstallmentStatus::Paid);
});
