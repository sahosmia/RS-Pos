<?php

use App\Models\Asset;
use App\Models\AssetTransaction;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;

/*
 * "Delete selected" must obey exactly the rules of the one-by-one delete: whatever may not be deleted is
 * kept (with its reason), the rest goes, and the delete permission is required.
 */

test('bulk deleting products removes the clean ones and keeps those with stock movements', function () {
    $clean = Product::factory()->create();
    $used = Product::factory()->create();
    StockMovement::factory()->create(['product_id' => $used->id]);

    $this->actingAs(userWithPermissions(['product.view', 'product.delete']))
        ->post(route('products.bulk-delete'), ['ids' => [$clean->id, $used->id]])
        ->assertSessionHasErrors('bulk_delete');

    expect(Product::find($clean->id))->toBeNull()
        ->and(Product::find($used->id))->not->toBeNull();
});

test('bulk deleting sales only removes drafts, never confirmed sales', function () {
    $draft = Sale::factory()->create();
    $confirmed = Sale::factory()->confirmed()->create();

    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.delete']))
        ->post(route('sales.bulk-delete'), ['ids' => [$draft->id, $confirmed->id]])
        ->assertSessionHasErrors('bulk_delete');

    expect(Sale::find($draft->id))->toBeNull()
        ->and(Sale::find($confirmed->id))->not->toBeNull();
});

test('a user limited to their own sales cannot bulk delete someone elses draft', function () {
    $others = Sale::factory()->create(['created_by' => userWithPermissions([])->id]);

    $this->actingAs(userWithPermissions(['sale.view_own', 'sale.delete']))
        ->post(route('sales.bulk-delete'), ['ids' => [$others->id]])
        ->assertSessionHasErrors('bulk_delete');

    expect(Sale::find($others->id))->not->toBeNull();
});

test('bulk deleting assets keeps those with transactions', function () {
    $clean = Asset::factory()->create();
    $used = Asset::factory()->create();
    AssetTransaction::factory()->create(['asset_id' => $used->id]);

    $this->actingAs(userWithPermissions(['asset.view', 'asset.delete']))
        ->post(route('assets.bulk-delete'), ['ids' => [$clean->id, $used->id]])
        ->assertSessionHasErrors('bulk_delete');

    expect(Asset::find($clean->id))->toBeNull()
        ->and(Asset::find($used->id))->not->toBeNull();
});

test('bulk delete needs the delete permission, not just view or create', function (string $routeName, string $permission) {
    $this->actingAs(userWithPermissions([$permission]))
        ->post(route($routeName), ['ids' => [1]])
        ->assertForbidden();
})->with([
    ['products.bulk-delete', 'product.create'],
    ['sales.bulk-delete', 'sale.create'],
    ['purchases.bulk-delete', 'purchase.create'],
    ['expenses.bulk-delete', 'expense.create'],
    ['other-income.bulk-delete', 'expense.create'],
    ['assets.bulk-delete', 'asset.create'],
    ['investors.bulk-delete', 'finance.create'],
    ['company-loans.bulk-delete', 'finance.create'],
    ['other-liabilities.bulk-delete', 'asset.create'],
]);

test('bulk delete refuses an empty selection', function () {
    $this->actingAs(userWithPermissions(['product.view', 'product.delete']))
        ->post(route('products.bulk-delete'), ['ids' => []])
        ->assertSessionHasErrors('ids');
});
