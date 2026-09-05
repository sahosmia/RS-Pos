<?php

use App\Enums\NormalBalance;
use App\Exceptions\UnbalancedJournalEntryException;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Services\JournalService;
use Illuminate\Support\Carbon;

test('posting an unbalanced entry throws and writes nothing', function () {
    $cash = ChartOfAccount::factory()->create(['normal_balance' => NormalBalance::Debit, 'balance' => 0]);
    $revenue = ChartOfAccount::factory()->create(['normal_balance' => NormalBalance::Credit, 'balance' => 0]);

    $post = fn () => app(JournalService::class)->post(
        Carbon::parse('2026-03-01'),
        'Unbalanced test',
        [
            ['chart_of_account_id' => $cash->id, 'debit' => 1000, 'credit' => 0],
            ['chart_of_account_id' => $revenue->id, 'debit' => 0, 'credit' => 900],
        ],
    );

    expect($post)->toThrow(UnbalancedJournalEntryException::class);

    expect(JournalEntry::query()->count())->toBe(0)
        ->and($cash->fresh()->balance)->toBe(0.0)
        ->and($revenue->fresh()->balance)->toBe(0.0);
});

test('posting a balanced entry saves every line and updates each account balance', function () {
    $receivable = ChartOfAccount::factory()->create(['normal_balance' => NormalBalance::Debit, 'balance' => 0]);
    $revenue = ChartOfAccount::factory()->create(['normal_balance' => NormalBalance::Credit, 'balance' => 0]);

    $entry = app(JournalService::class)->post(
        Carbon::parse('2026-03-01'),
        'Sale on credit',
        [
            ['chart_of_account_id' => $receivable->id, 'debit' => 1000, 'credit' => 0],
            ['chart_of_account_id' => $revenue->id, 'debit' => 0, 'credit' => 1000],
        ],
        'sale',
        7,
    );

    expect($entry->reference_type)->toBe('sale')
        ->and($entry->reference_id)->toBe(7)
        ->and($entry->lines)->toHaveCount(2)
        ->and($receivable->fresh()->balance)->toBe(1000.0)
        ->and($revenue->fresh()->balance)->toBe(1000.0);
});

test('a credit-normal account balance decreases on a debit line', function () {
    $payable = ChartOfAccount::factory()->create(['normal_balance' => NormalBalance::Credit, 'balance' => 1000]);
    $cash = ChartOfAccount::factory()->create(['normal_balance' => NormalBalance::Debit, 'balance' => 1000]);

    // Paying down a payable: Dr Accounts Payable, Cr Cash.
    app(JournalService::class)->post(
        Carbon::parse('2026-03-02'),
        'Pay supplier',
        [
            ['chart_of_account_id' => $payable->id, 'debit' => 400, 'credit' => 0],
            ['chart_of_account_id' => $cash->id, 'debit' => 0, 'credit' => 400],
        ],
    );

    expect($payable->fresh()->balance)->toBe(600.0)
        ->and($cash->fresh()->balance)->toBe(600.0);
});
