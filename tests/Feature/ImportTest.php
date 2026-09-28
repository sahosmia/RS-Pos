<?php

use App\Models\Category;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Http\UploadedFile;

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());
});

function uploadCsv(string $name, string $content): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, $content);
}

test('importing products creates new rows, auto-creates lookups, and skips an existing SKU', function () {
    Product::factory()->create(['sku' => 'EXISTING-001']);

    $csv = "name,sku,category,unit,brand,selling_price,opening_stock,opening_stock_cost\n".
        "Walton AC 1 Ton,WAL-AC-1T,Air Conditioner,Piece,Walton,45000,5,35000\n".
        "Duplicate SKU Product,EXISTING-001,Air Conditioner,Piece,Walton,1000,0,0\n";

    $this->post(route('imports.products'), ['file' => uploadCsv('products.csv', $csv)])
        ->assertRedirect(route('imports.index'));

    $product = Product::query()->where('sku', 'WAL-AC-1T')->firstOrFail();

    expect($product->name)->toBe('Walton AC 1 Ton')
        ->and($product->current_stock)->toBe(5.0)
        ->and($product->avg_cost)->toBe(35000.0)
        ->and($product->category->name)->toBe('Air Conditioner')
        ->and($product->unit->name)->toBe('Piece')
        ->and(Category::query()->where('name', 'Air Conditioner')->count())->toBe(1)
        ->and(Product::query()->where('sku', 'EXISTING-001')->count())->toBe(1);
});

test('importing contacts creates new contacts and skips a duplicate phone+type', function () {
    Contact::factory()->create(['phone' => '+8801711111111', 'type' => 'customer']);

    $csv = "name,phone,email,type\n".
        "Karim Uddin,+8801811111111,karim@example.com,customer\n".
        "Existing Customer,+8801711111111,other@example.com,customer\n";

    $this->post(route('imports.contacts'), ['file' => uploadCsv('contacts.csv', $csv)])
        ->assertRedirect(route('imports.index'));

    expect(Contact::query()->where('phone', '+8801811111111')->count())->toBe(1)
        ->and(Contact::query()->where('phone', '+8801711111111')->count())->toBe(1);
});

test('importing opening stock sets stock on an untouched product and skips one that already has movements', function () {
    $fresh = Product::factory()->create(['sku' => 'FRESH-001', 'current_stock' => 0]);
    $touched = Product::factory()->create(['sku' => 'TOUCHED-001', 'current_stock' => 10]);
    StockMovement::factory()->create(['product_id' => $touched->id]);

    $csv = "sku,quantity,unit_cost\n".
        "FRESH-001,20,150.5\n".
        "TOUCHED-001,5,100\n".
        "MISSING-SKU,5,100\n";

    $this->post(route('imports.opening-stock'), ['file' => uploadCsv('opening-stock.csv', $csv)])
        ->assertRedirect(route('imports.index'));

    expect($fresh->fresh()->current_stock)->toBe(20.0)
        ->and($fresh->fresh()->avg_cost)->toBe(150.5)
        ->and($touched->fresh()->current_stock)->toBe(10.0);
});

test('importing sales groups rows by invoice number into one historical sale with no stock or ledger effect', function () {
    $product = Product::factory()->create(['sku' => 'IMP-SALE-001', 'current_stock' => 10]);

    $csv = "invoice_no,customer_name,customer_phone,sale_date,sku,quantity,unit_price,order_total\n".
        "OLD-INV-001,Jashim Uddin,+8801911111111,2025-01-15,IMP-SALE-001,2,500,1000\n";

    $this->post(route('imports.sales'), ['file' => uploadCsv('sales.csv', $csv)])
        ->assertRedirect(route('imports.index'));

    $sale = Sale::query()->where('invoice_no', 'OLD-INV-001')->firstOrFail();

    expect($sale->source->value)->toBe('imported')
        ->and($sale->status->value)->toBe('confirmed')
        ->and($sale->total_amount)->toBe(1000.0)
        ->and($sale->payment_status->value)->toBe('paid')
        ->and($product->fresh()->current_stock)->toBe(10.0)
        ->and(StockMovement::query()->where('product_id', $product->id)->count())->toBe(0)
        ->and(Contact::query()->where('phone', '+8801911111111')->firstOrFail()->balance)->toBe(0.0);
});

test('re-importing the same invoice number is skipped, not duplicated', function () {
    $product = Product::factory()->create(['sku' => 'IMP-SALE-002', 'current_stock' => 10]);

    $csv = "invoice_no,customer_name,customer_phone,sale_date,sku,quantity,unit_price\n".
        "OLD-INV-002,Rahima Begum,+8801611111111,2025-02-01,IMP-SALE-002,1,300\n";

    $this->post(route('imports.sales'), ['file' => uploadCsv('sales1.csv', $csv)]);
    $this->post(route('imports.sales'), ['file' => uploadCsv('sales2.csv', $csv)]);

    expect(Sale::query()->where('invoice_no', 'OLD-INV-002')->count())->toBe(1);
});

test('a row with database constraint failure is captured in skipped result without crashing', function () {
    Product::factory()->create(['name' => 'Existing Product', 'sku' => 'SKU-EXISTS-999', 'barcode' => 'BAR-DUP-123']);

    $csv = "name,sku,category,unit,brand,selling_price,barcode\n".
        "Valid Product,SKU-VALID-100,Cat1,Pcs,,500,BAR-UNIQUE-001\n".
        "Bad Barcode Product,SKU-FAIL-101,Cat1,Pcs,,500,BAR-DUP-123\n";

    $response = $this->post(route('imports.products'), ['file' => uploadCsv('products.csv', $csv)])
        ->assertRedirect(route('imports.index'));

    $result = session('importResult');

    expect($result['created'])->toBe(1)
        ->and($result['skipped'])->toBe(1)
        ->and(Product::query()->where('sku', 'SKU-VALID-100')->exists())->toBeTrue()
        ->and(Product::query()->where('sku', 'SKU-FAIL-101')->exists())->toBeFalse();
});
