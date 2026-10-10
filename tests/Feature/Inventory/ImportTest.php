<?php

use App\Models\Account;
use App\Models\AccountType;
use App\Models\Category;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\ImportCell;
use App\Support\ImportSchema;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

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

test('the import page ships every import type with its required and optional columns', function () {
    $this->get(route('imports.index'))
        ->assertInertia(fn ($page) => $page
            ->component('imports/index')
            ->has('schemas', 4)
            ->where('schemas.products.columns.0.name', 'name')
            ->where('schemas.products.columns.0.requirement', 'required')
            ->where('schemas.products.columns.5.requirement', 'optional'));
});

test('each import type offers an Excel template with the exact header row and an example row', function (string $type, string $firstHeader) {
    $response = $this->get(route('imports.template', $type))->assertOk();

    $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();

    expect($response->headers->get('content-disposition'))->toContain("{$type}-import-template.xlsx")
        ->and($sheet->getHighestRow())->toBe(2)
        ->and($sheet->getCell('A1')->getValue())->toBe($firstHeader);
})->with([
    ['products', 'name'],
    ['contacts', 'name'],
    ['opening-stock', 'sku'],
    ['sales', 'invoice_no'],
]);

test('the contacts template keeps the example phone as text, so Excel cannot turn it into 8.80181E+12', function () {
    $response = $this->get(route('imports.template', 'contacts'))->assertOk();
    $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();

    $column = array_search('phone', ImportSchema::headerRow('contacts'), true) + 1;
    $cell = $sheet->getCell(Coordinate::stringFromColumnIndex($column).'2');

    expect($cell->getValue())->toBe('+8801811111111')
        ->and($cell->getDataType())->toBe(DataType::TYPE_STRING)
        ->and($cell->getStyle()->getNumberFormat()->getFormatCode())->toBe(NumberFormat::FORMAT_TEXT);
});

test('a phone Excel has already turned into scientific notation is refused with a clear message, not saved wrong', function () {
    $csv = "name,phone,type\n".
        "Mangled Customer,8.80181E+12,customer\n".
        "Good Customer,+8801811111111,customer\n".
        "Spaced Customer,+880 1811-222222,customer\n";

    $this->post(route('imports.contacts'), ['file' => uploadCsv('contacts.csv', $csv)])->assertRedirect(route('imports.index'));

    expect(Contact::query()->where('name', 'Mangled Customer')->exists())->toBeFalse()
        ->and(Contact::query()->where('name', 'Good Customer')->value('phone'))->toBe('+8801811111111')
        ->and(Contact::query()->where('name', 'Spaced Customer')->value('phone'))->toBe('+8801811222222');

    $result = session('importResult');

    expect($result['created'])->toBe(2)
        ->and(collect($result['messages'])->join(' '))->toContain('scientific notation');
});

test('a scientific-notation value that lost no digit is expanded to the full number', function () {
    expect(ImportCell::identifier('8.801811111111E+12'))->toBe('8801811111111')
        ->and(ImportCell::identifier(8801811111111.0))->toBe('8801811111111')
        ->and(ImportCell::identifier('  WAL-AC-1T '))->toBe('WAL-AC-1T')
        ->and(ImportCell::identifier(''))->toBeNull()
        ->and(fn () => ImportCell::identifier('8.80181E+12', 'phone'))->toThrow(InvalidArgumentException::class);
});
test('an unknown template type is a 404', function () {
    $this->get('/imports/nope/template')->assertNotFound();
});

test('a downloaded template can be imported back as it is, with the example phone intact', function () {
    $downloaded = $this->get(route('imports.template', 'contacts'))->assertOk()->baseResponse->getFile()->getPathname();
    $upload = new UploadedFile($downloaded, 'contacts-import-template.xlsx', null, null, true);

    $this->post(route('imports.contacts'), ['file' => $upload])->assertRedirect(route('imports.index'));

    expect(session('importResult')['created'])->toBe(1)
        ->and(Contact::query()->latest('id')->value('phone'))->toBe('+8801811111111');
});

test('a file missing required columns is rejected up front with a message naming them', function () {
    $csv = "name,sku,selling_price\nWidget,W-1,10\n";

    $this->post(route('imports.products'), ['file' => uploadCsv('products.csv', $csv)])
        ->assertSessionHasErrors(['file' => 'Missing required columns: category, unit. Download the template to see the expected header row.']);

    expect(Product::query()->where('sku', 'W-1')->exists())->toBeFalse();
});

test('the sales import accepts either sku or product_name but needs one of them', function () {
    $csv = "invoice_no,customer_name,sale_date,quantity,unit_price\nINV-1,Someone,2025-01-01,1,10\n";

    $this->post(route('imports.sales'), ['file' => uploadCsv('sales.csv', $csv)])
        ->assertSessionHasErrors(['file' => 'Missing required column: sku or product_name. Download the template to see the expected header row.']);
});

test('a file with a header but no data rows is rejected', function () {
    $this->post(route('imports.opening-stock'), ['file' => uploadCsv('stock.csv', "sku,quantity,unit_cost\n")])
        ->assertSessionHasErrors(['file' => 'The file has no data rows. Add at least one row under the header row.']);
});

test('a wrong file type gets a plain-language message', function () {
    $this->post(route('imports.products'), ['file' => UploadedFile::fake()->create('products.pdf', 10, 'application/pdf')])
        ->assertSessionHasErrors(['file' => 'The file must be an Excel (.xlsx, .xls) or CSV (.csv) file.']);
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

// ---- two-step import: preview what would happen, then confirm ------------------------------------------

test('a preview shows each row with the value for each field and imports nothing', function () {
    Storage::fake('local');
    Product::factory()->create(['sku' => 'EXISTING-001']);

    $csv = "name,sku,category,unit,selling_price,opening_stock,opening_stock_cost\n".
        "Walton AC 1 Ton,WAL-AC-1T,Air Conditioner,Piece,45000,5,35000\n".
        "Duplicate,EXISTING-001,Air Conditioner,Piece,1000,0,0\n".
        ",NO-NAME,Air Conditioner,Piece,10,0,0\n";

    $this->post(route('imports.preview', 'products'), ['file' => uploadCsv('products.csv', $csv)])
        ->assertRedirect(route('imports.index'))
        ->assertSessionHas('importPreview', function (array $preview) {
            return $preview['created'] === 1
                && $preview['skipped'] === 2
                && $preview['rows'][0]['status'] === 'created'
                && $preview['rows'][0]['where'] === '2'
                && $preview['rows'][0]['values']['sku'] === 'WAL-AC-1T'
                && $preview['rows'][0]['values']['selling_price'] === '45000'
                && $preview['rows'][1]['status'] === 'skipped'
                && str_contains($preview['rows'][1]['reason'], 'already exists')
                && $preview['rows'][2]['status'] === 'skipped'
                && $preview['rows'][2]['values']['sku'] === 'NO-NAME';
        });

    // Nothing was kept: no product, no auto-created category/unit, no stock movement.
    expect(Product::query()->where('sku', 'WAL-AC-1T')->exists())->toBeFalse()
        ->and(Category::query()->where('name', 'Air Conditioner')->exists())->toBeFalse()
        ->and(StockMovement::query()->count())->toBe(0);
});

test('confirming a preview imports exactly what it showed and then forgets the file', function () {
    Storage::fake('local');
    $csv = "name,sku,category,unit,selling_price\nWalton AC,WAL-AC-1T,Air Conditioner,Piece,45000\n";

    $this->post(route('imports.preview', 'products'), ['file' => uploadCsv('products.csv', $csv)]);
    $token = session('importPreview')['token'];
    expect(Storage::disk('local')->files('imports-preview'))->toHaveCount(1);

    $this->post(route('imports.confirm', 'products'), ['token' => $token])->assertRedirect(route('imports.index'));

    expect(Product::query()->where('sku', 'WAL-AC-1T')->exists())->toBeTrue()
        ->and(session('importResult')['created'])->toBe(1)
        ->and(session('importResult')['rows'][0]['values']['name'])->toBe('Walton AC')
        ->and(Storage::disk('local')->files('imports-preview'))->toHaveCount(0);
});

test('cancelling a preview deletes the waiting file and imports nothing', function () {
    Storage::fake('local');
    $csv = "name,sku,category,unit,selling_price\nWalton AC,WAL-AC-1T,Air Conditioner,Piece,45000\n";

    $this->post(route('imports.preview', 'products'), ['file' => uploadCsv('products.csv', $csv)]);
    $token = session('importPreview')['token'];

    $this->delete(route('imports.preview.discard', $token))->assertRedirect(route('imports.index'));

    expect(Storage::disk('local')->files('imports-preview'))->toHaveCount(0)
        ->and(Product::query()->count())->toBe(0);
});

test('confirming with an unknown or expired token asks for the file again and imports nothing', function () {
    Storage::fake('local');

    $this->post(route('imports.confirm', 'products'), ['token' => (string) Str::uuid()])->assertSessionHasErrors('file');
    $this->post(route('imports.confirm', 'products'), ['token' => 'not-a-uuid'])->assertSessionHasErrors('token');

    expect(Product::query()->count())->toBe(0);
});

test('a sales preview shows the invoice with its lines and total but saves no sale, customer or stock change', function () {
    Storage::fake('local');
    $product = Product::factory()->create(['sku' => 'AC-1', 'selling_price' => 1000, 'current_stock' => 10]);

    $csv = "invoice_no,sale_date,customer_name,customer_phone,sku,quantity,unit_price\n".
        "INV-9001,2026-03-01,Preview Buyer,+8801911000000,AC-1,2,1000\n";

    $this->post(route('imports.preview', 'sales'), ['file' => uploadCsv('sales.csv', $csv)])
        ->assertSessionHas('importPreview', fn (array $preview) => $preview['created'] === 1
            && $preview['rows'][0]['where'] === 'INV-9001'
            && $preview['rows'][0]['values']['customer_name'] === 'Preview Buyer'
            && $preview['rows'][0]['values']['total'] === '2000');

    expect(Sale::query()->count())->toBe(0)
        ->and(Contact::query()->where('name', 'Preview Buyer')->exists())->toBeFalse()
        ->and($product->fresh()->current_stock)->toBe(10.0);
});

test('a bad file fails at the preview step with one clear message and keeps nothing waiting', function () {
    Storage::fake('local');

    $this->post(route('imports.preview', 'contacts'), ['file' => uploadCsv('contacts.csv', "wrong,columns\n1,2\n")])
        ->assertSessionHasErrors('file');
    $this->post(route('imports.preview', 'nope'), ['file' => uploadCsv('x.csv', "a\n1\n")])->assertNotFound();

    expect(Storage::disk('local')->files('imports-preview'))->toHaveCount(0);
});

// ---- the sales import carries every sale field: discounts, installation, warranty, live vs historical ----

test('a historical sales row carries line and invoice discounts, installation and warranty into the invoice', function () {
    $product = Product::factory()->create(['sku' => 'AC-1', 'current_stock' => 10]);

    $csv = "invoice_no,sale_date,customer_name,sku,quantity,unit_price,item_discount_type,item_discount_value,discount_type,discount_value,installation_charge,warranty_months,order_total\n".
        "OLD-1,2026-03-01,Old Buyer,AC-1,2,500,percentage,10,flat,50,300,12,1150\n";

    $this->post(route('imports.sales'), ['file' => uploadCsv('sales.csv', $csv)])->assertRedirect(route('imports.index'));

    $sale = Sale::query()->where('invoice_no', 'OLD-1')->firstOrFail();
    $item = $sale->items()->firstOrFail();

    // 2 × 500 less 10% = 900; less 50 invoice discount = 850; plus 300 installation = 1,150.
    expect($sale->total_amount)->toBe(1150.0)
        ->and($sale->source->value)->toBe('imported')
        ->and($sale->payment_status->value)->toBe('paid')
        ->and($item->unit_price)->toBe(450.0)
        ->and($item->installation_charge)->toBe(300.0)
        ->and($item->warranty_months)->toBe(12)
        ->and($item->warranty_expires_at->toDateString())->toBe('2027-03-01')
        ->and($product->fresh()->current_stock)->toBe(10.0)           // historical: stock untouched
        ->and(session('importResult')['messages'])->toBe([]);          // order_total matched
});

test('a row saying historical = no becomes a live sale: stock goes out and the payment is recorded', function () {
    $product = Product::factory()->create(['sku' => 'AC-1', 'current_stock' => 10]);
    $cash = Account::factory()->create(['name' => 'Cash in Hand', 'account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    $csv = "invoice_no,sale_date,customer_name,sku,quantity,unit_price,historical,paid_amount,payment_account\n".
        "LIVE-1,2026-03-01,Live Buyer,AC-1,2,500,no,400,Cash in Hand\n";

    $this->post(route('imports.sales'), ['file' => uploadCsv('sales.csv', $csv)])->assertRedirect(route('imports.index'));

    $sale = Sale::query()->where('invoice_no', 'LIVE-1')->firstOrFail();

    expect($sale->source->value)->toBe('manual')
        ->and($sale->paid_amount)->toBe(400.0)
        ->and($sale->due_amount)->toBe(600.0)
        ->and($product->fresh()->current_stock)->toBe(8.0)
        ->and($cash->fresh()->current_balance)->toBe(400.0)
        ->and(Contact::query()->where('name', 'Live Buyer')->value('balance'))->toBe(600.0);
});

test('a live sale row whose payment account does not exist, or whose discount type is wrong, skips that invoice with the reason', function () {
    Product::factory()->create(['sku' => 'AC-1', 'current_stock' => 10]);

    $csv = "invoice_no,sale_date,customer_name,sku,quantity,unit_price,historical,paid_amount,payment_account,discount_type,discount_value\n".
        "LIVE-2,2026-03-01,Buyer A,AC-1,1,500,no,100,No Such Account,,\n".
        "OLD-2,2026-03-01,Buyer B,AC-1,1,500,yes,,,half,10\n";

    $this->post(route('imports.sales'), ['file' => uploadCsv('sales.csv', $csv)]);

    $result = session('importResult');

    expect(Sale::query()->count())->toBe(0)
        ->and($result['skipped'])->toBe(2)
        ->and(collect($result['messages'])->join(' | '))->toContain('payment_account')->toContain('discount_type must be flat or percentage');
});

test('the sales template lists the new columns as optional so the table on the page matches the file', function () {
    $columns = collect(ImportSchema::for('sales')['columns'])->keyBy('name');

    foreach (['historical', 'item_discount_type', 'item_discount_value', 'discount_type', 'discount_value', 'installation_charge', 'warranty_months', 'paid_amount', 'payment_account'] as $name) {
        expect($columns[$name]['requirement'])->toBe('optional');
    }
});
