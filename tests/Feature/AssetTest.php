<?php

use App\Actions\Asset\AddAssetTransactionAction;
use App\Actions\Asset\CreateAssetAction;
use App\Actions\Asset\UpdateAssetAction;
use App\Exceptions\AssetAlreadyDisposedException;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Asset;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('creating an asset with an opening value posts a balanced journal entry against Opening Balance Equity', function () {
    $this->actingAs(User::factory()->create());

    $asset = app(CreateAssetAction::class)->execute(['name' => 'Delivery Van', 'opening_value' => 200000]);

    expect($asset->current_value)->toBe(200000.0);

    $entry = JournalEntry::where('reference_type', 'asset_opening_value')->where('reference_id', $asset->id)->firstOrFail();
    $fixedAssets = ChartOfAccount::where('code', '1400')->firstOrFail();

    expect($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and($fixedAssets->fresh()->balance)->toBe(200000.0);
});

test('HasLedger::recalculateLedgerBalance re-derives current_value from the transaction log', function () {
    $this->actingAs(User::factory()->create());
    $asset = app(CreateAssetAction::class)->execute(['name' => 'Office Furniture', 'opening_value' => 50000]);

    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 100000]);
    app(AddAssetTransactionAction::class)->execute($asset, ['type' => 'addition', 'amount' => 10000, 'account_id' => $account->id]);

    // Force the cached column out of sync, then prove recalculation repairs it from the ledger.
    $asset->forceFill(['current_value' => 999999])->save();
    $asset->recalculateLedgerBalance();

    expect($asset->fresh()->current_value)->toBe(60000.0);
});

test('purchase and addition grow current_value and pay from the chosen account', function () {
    $this->actingAs(User::factory()->create());
    $asset = app(CreateAssetAction::class)->execute(['name' => 'Shop Fridge']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 100000]);

    app(AddAssetTransactionAction::class)->execute($asset, ['type' => 'purchase', 'amount' => 40000, 'account_id' => $account->id]);

    expect($asset->fresh()->current_value)->toBe(40000.0)
        ->and($account->fresh()->current_balance)->toBe(60000.0);
});

test('selling an asset above book value posts the gain, below book value posts the loss', function () {
    $this->actingAs(User::factory()->create());
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);
    $gain = ChartOfAccount::where('code', '4300')->firstOrFail();
    $loss = ChartOfAccount::where('code', '5950')->firstOrFail();

    $assetGain = app(CreateAssetAction::class)->execute(['name' => 'Van A', 'opening_value' => 100000]);
    app(AddAssetTransactionAction::class)->execute($assetGain, ['type' => 'sold', 'sale_price' => 120000, 'account_id' => $account->id]);

    expect($assetGain->fresh()->current_value)->toBe(0.0)
        ->and($gain->fresh()->balance)->toBe(20000.0)
        ->and($account->fresh()->current_balance)->toBe(120000.0);

    $assetLoss = app(CreateAssetAction::class)->execute(['name' => 'Van B', 'opening_value' => 100000]);
    app(AddAssetTransactionAction::class)->execute($assetLoss, ['type' => 'sold', 'sale_price' => 70000, 'account_id' => $account->id]);

    expect($assetLoss->fresh()->current_value)->toBe(0.0)
        ->and($loss->fresh()->balance)->toBe(30000.0);
});

test('disposal writes off the full book value as a loss with no account movement', function () {
    $this->actingAs(User::factory()->create());
    $asset = app(CreateAssetAction::class)->execute(['name' => 'Broken Chair', 'opening_value' => 5000]);

    app(AddAssetTransactionAction::class)->execute($asset, ['type' => 'disposal']);

    $loss = ChartOfAccount::where('code', '5950')->firstOrFail();

    expect($asset->fresh()->current_value)->toBe(0.0)
        ->and($loss->fresh()->balance)->toBe(5000.0);
});

test('selling an already-disposed asset throws', function () {
    $this->actingAs(User::factory()->create());
    $asset = app(CreateAssetAction::class)->execute(['name' => 'Old Printer', 'opening_value' => 3000]);
    app(AddAssetTransactionAction::class)->execute($asset, ['type' => 'disposal']);

    $attempt = fn () => app(AddAssetTransactionAction::class)->execute($asset->fresh(), ['type' => 'disposal']);

    expect($attempt)->toThrow(AssetAlreadyDisposedException::class);
});

test('the opening value can be corrected before any other transaction, and is locked afterward', function () {
    $this->actingAs(User::factory()->create());
    $asset = app(CreateAssetAction::class)->execute(['name' => 'Generator', 'opening_value' => 10000]);

    expect($asset->canEditOpeningValue())->toBeTrue();

    app(UpdateAssetAction::class)->execute($asset, ['name' => 'Generator', 'opening_value' => 15000]);
    expect($asset->fresh()->current_value)->toBe(15000.0);

    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 100000]);
    app(AddAssetTransactionAction::class)->execute($asset->fresh(), ['type' => 'addition', 'amount' => 1000, 'account_id' => $account->id]);

    expect($asset->fresh()->canEditOpeningValue())->toBeFalse();
});

test('an existing asset can be created with no opening value — it simply starts at 0 with no journal entry', function () {
    $this->actingAs(User::factory()->create());

    $this->post(route('assets.store'), ['asset_type' => 'existing', 'name' => 'Old Shelf', 'opening_value' => null])
        ->assertSessionHasNoErrors();

    $asset = Asset::where('name', 'Old Shelf')->firstOrFail();

    expect($asset->current_value)->toBe(0.0)
        ->and(JournalEntry::where('reference_type', 'asset_opening_value')->where('reference_id', $asset->id)->exists())->toBeFalse();
});

test('a new asset is bought from an account at creation, never an opening balance', function () {
    $this->actingAs(User::factory()->create());
    $account = Account::factory()->create(['account_type_id' => AccountType::factory()->create()->id, 'current_balance' => 100000]);

    $this->post(route('assets.store'), [
        'asset_type' => 'new',
        'name' => 'New Laptop',
        'purchase_amount' => 30000,
        'account_id' => $account->id,
        'opening_value' => 0,
    ])->assertSessionHasNoErrors();

    $asset = Asset::where('name', 'New Laptop')->firstOrFail();

    expect($asset->current_value)->toBe(30000.0)
        ->and($account->fresh()->current_balance)->toBe(70000.0)
        ->and(JournalEntry::where('reference_type', 'asset_opening_value')->where('reference_id', $asset->id)->exists())->toBeFalse();
});

test('a new asset requires a purchase amount and an account', function () {
    $this->actingAs(User::factory()->create());

    $this->post(route('assets.store'), ['asset_type' => 'new', 'name' => 'X'])
        ->assertSessionHasErrors(['purchase_amount', 'account_id']);
});
