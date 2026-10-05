<?php

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Services\AccountService;
use Illuminate\Support\Carbon;

test('record stores the business date and moves the cached balance together', function () {
    $account = Account::factory()->create(['current_balance' => 0]);

    $transaction = app(AccountService::class)->record(
        $account,
        AccountTransactionType::SalePayment,
        1500.50,
        Carbon::parse('2026-01-05'),
        'sale',
        7,
    );

    expect($transaction->operation_date->toDateString())->toBe('2026-01-05')
        ->and($transaction->reference_type)->toBe('sale')
        ->and($transaction->reference_id)->toBe(7)
        ->and($account->fresh()->current_balance)->toBe(1500.50);
});

test('a negative amount takes money out of the account', function () {
    $account = Account::factory()->create(['current_balance' => 1000]);

    app(AccountService::class)->record(
        $account,
        AccountTransactionType::PurchasePayment,
        -400,
        Carbon::parse('2026-01-06'),
    );

    expect($account->fresh()->current_balance)->toBe(600.0);
});

test('split payment divides one payment across two accounts', function () {
    $cash = Account::factory()->create(['current_balance' => 0]);
    $bank = Account::factory()->create(['current_balance' => 0]);

    $total = app(AccountService::class)->recordSplitPayment(
        [
            ['account_id' => $cash->id, 'amount' => 300],
            ['account_id' => $bank->id, 'amount' => 200],
        ],
        AccountTransactionType::SalePayment,
        Carbon::parse('2026-02-01'),
        'sale',
        12,
    );

    expect($total)->toBe(500.0)
        ->and($cash->fresh()->current_balance)->toBe(300.0)
        ->and($bank->fresh()->current_balance)->toBe(200.0)
        ->and(AccountTransaction::query()->where('reference_type', 'sale')->where('reference_id', 12)->count())->toBe(2);
});
