<?php

use App\Models\AccountTransaction;
use App\Models\CashBook;
use App\Models\CashBookEntry;
use App\Models\MiscTransactionCategory;
use App\Models\User;

beforeEach(function () {
    CashBook::query()->create([]);
    $this->actingAs(User::factory()->create());
});

test('an expense lowers the cash book balance without touching any account', function () {
    $category = MiscTransactionCategory::factory()->create();

    $this->post('/cash-book', [
        'type' => 'expense',
        'category_id' => $category->id,
        'amount' => 120,
        'entry_date' => '2026-03-01',
        'note' => 'Rickshaw fare',
    ])->assertRedirect();

    expect(CashBook::current()->current_balance)->toBe(-120.0)
        ->and(AccountTransaction::query()->count())->toBe(0);
});

test('income raises the cash book balance', function () {
    $category = MiscTransactionCategory::factory()->income()->create();

    $this->post('/cash-book', [
        'type' => 'income',
        'category_id' => $category->id,
        'amount' => 300,
        'entry_date' => '2026-03-02',
    ]);

    expect(CashBook::current()->current_balance)->toBe(300.0);
});

test('the category has to match the entry type', function () {
    $expenseCategory = MiscTransactionCategory::factory()->create();

    $this->post('/cash-book', [
        'type' => 'income',
        'category_id' => $expenseCategory->id,
        'amount' => 300,
        'entry_date' => '2026-03-02',
    ])->assertSessionHasErrors('category_id');

    expect(CashBookEntry::query()->count())->toBe(0);
});

test('the opening balance can only be set on an empty cash book', function () {
    CashBookEntry::factory()->create();

    $this->post('/cash-book', [
        'type' => 'opening_balance',
        'amount' => 1000,
        'entry_date' => '2026-03-02',
    ])->assertSessionHasErrors('type');
});

test('cash book page lists entries with the running balance', function () {
    CashBookEntry::factory()->create(['amount' => 50]);

    $this->get('/cash-book')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('cash-book/index')
            ->has('entries.data', 1)
            ->where('openingBalanceSet', true));
});
