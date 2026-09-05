<?php

use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('confirming a sale posts a balanced journal entry with a receivable/revenue pair and a COGS/inventory pair', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000, 'current_stock' => 5, 'avg_cost' => 600]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 1000, 'original_price' => 1000, 'subtotal' => 2000]);
    $sale->forceFill(['total_amount' => 2000, 'due_amount' => 2000])->save();

    $this->post("/sales/{$sale->id}/confirm", [])->assertRedirect();

    $entry = JournalEntry::query()->where('reference_type', 'sale')->where('reference_id', $sale->id)->firstOrFail();
    $totalDebit = $entry->lines->sum('debit');
    $totalCredit = $entry->lines->sum('credit');

    $receivable = ChartOfAccount::where('code', '1100')->first();
    $revenue = ChartOfAccount::where('code', '4100')->first();
    $cogs = ChartOfAccount::where('code', '5100')->first();
    $inventory = ChartOfAccount::where('code', '1200')->first();

    expect($totalDebit)->toBe($totalCredit)
        ->and($totalDebit)->toBe(3200.0) // 2000 (AR) + 1200 (COGS: 2 * 600)
        ->and($receivable->fresh()->balance)->toBe(2000.0)
        ->and($revenue->fresh()->balance)->toBe(2000.0)
        ->and($cogs->fresh()->balance)->toBe(1200.0)
        ->and($inventory->fresh()->balance)->toBe(-1200.0);
});

test('confirming a purchase posts a balanced journal entry debiting inventory and crediting payable', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 10, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 1000]);
    $purchase->forceFill(['total_amount' => 1000, 'due_amount' => 1000])->save();

    $this->post("/purchases/{$purchase->id}/confirm", [])->assertRedirect();

    $entry = JournalEntry::query()->where('reference_type', 'purchase')->where('reference_id', $purchase->id)->firstOrFail();
    $totalDebit = $entry->lines->sum('debit');
    $totalCredit = $entry->lines->sum('credit');

    $inventory = ChartOfAccount::where('code', '1200')->first();
    $payable = ChartOfAccount::where('code', '2100')->first();

    expect($totalDebit)->toBe($totalCredit)
        ->and($totalDebit)->toBe(1000.0)
        ->and($inventory->fresh()->balance)->toBe(1000.0)
        ->and($payable->fresh()->balance)->toBe(1000.0);
});

test('confirming a purchase with a cash payment adds a balanced payable/cash pair to the same entry', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $cashType = AccountType::factory()->create(['name' => 'Cash']);
    $cash = Account::factory()->create(['account_type_id' => $cashType->id, 'current_balance' => 0]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 500]);
    $purchase->forceFill(['total_amount' => 500, 'due_amount' => 500])->save();

    $this->post("/purchases/{$purchase->id}/confirm", [
        'payments' => [['account_id' => $cash->id, 'amount' => 200]],
    ])->assertRedirect();

    $entry = JournalEntry::query()->where('reference_type', 'purchase')->where('reference_id', $purchase->id)->firstOrFail();

    $payable = ChartOfAccount::where('code', '2100')->first();

    expect($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and($cash->chartOfAccount->fresh()->balance)->toBe(-200.0)
        ->and($payable->fresh()->balance)->toBe(300.0); // 500 - 200
});

test('a fund transfer posts a balanced journal entry between the two accounts', function () {
    $this->actingAs(User::factory()->create());
    $cashType = AccountType::factory()->create(['name' => 'Cash']);
    $bankType = AccountType::factory()->create(['name' => 'Bank']);
    $cash = Account::factory()->create(['account_type_id' => $cashType->id, 'current_balance' => 5000]);
    $bank = Account::factory()->create(['account_type_id' => $bankType->id, 'current_balance' => 0]);

    $this->post('/fund-transfers', [
        'from_account_id' => $cash->id,
        'to_account_id' => $bank->id,
        'amount' => 1500,
        'transfer_date' => '2026-03-01',
    ])->assertRedirect();

    $entry = JournalEntry::query()->where('reference_type', 'fund_transfer')->firstOrFail();

    expect($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and($entry->lines->sum('debit'))->toBe(1500.0)
        ->and($cash->chartOfAccount->fresh()->balance)->toBe(-1500.0)
        ->and($bank->chartOfAccount->fresh()->balance)->toBe(1500.0);
});
