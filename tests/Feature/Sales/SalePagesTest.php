<?php

use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('the sales list page renders', function () {
    $this->actingAs(userWithPermissions(['sale.view_all']));
    Sale::factory()->create(['customer_id' => Contact::factory(), 'total_amount' => 1000, 'paid_amount' => 600, 'due_amount' => 400]);

    $this->get('/sales?preset=all')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sales/index')
            ->where('stats.total_sales', 1)
            ->where('stats.total_amount', 1000)
            ->where('stats.total_paid', 600)
            ->where('stats.total_due', 400));
});

test('the sales list search matches by invoice number or customer name', function () {
    $this->actingAs(userWithPermissions(['sale.view_all']));
    $alice = Contact::factory()->create(['name' => 'Alice Traders']);
    $bob = Contact::factory()->create(['name' => 'Bob Enterprises']);
    Sale::factory()->create(['customer_id' => $alice->id, 'invoice_no' => 'INV-0001']);
    Sale::factory()->create(['customer_id' => $bob->id, 'invoice_no' => 'INV-0002']);

    $this->get('/sales?preset=all&search=Alice')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sales/index')
            ->has('sales.data', 1)
            ->where('sales.data.0.invoice_no', 'INV-0001'));

    $this->get('/sales?preset=all&search=INV-0002')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('sales.data', 1)
            ->where('sales.data.0.invoice_no', 'INV-0002'));
});

test('the sales list finds a sale by the customer phone number and sends the phone for display', function () {
    $this->actingAs(userWithPermissions(['sale.view_all']));
    $alice = Contact::factory()->create(['name' => 'Alice Traders', 'phone' => '01711223344']);
    $bob = Contact::factory()->create(['name' => 'Bob Enterprises', 'phone' => '01899887766']);
    Sale::factory()->create(['customer_id' => $alice->id, 'invoice_no' => 'INV-0001']);
    Sale::factory()->create(['customer_id' => $bob->id, 'invoice_no' => 'INV-0002']);

    $this->get('/sales?preset=all&search=0171122')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('sales.data', 1)
            ->where('sales.data.0.invoice_no', 'INV-0001')
            ->where('sales.data.0.customer.phone', '01711223344'));
});
test('the add sale page renders', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/sales/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales/create'));
});

test('the add sale page auto-selects customer when customer_id query parameter is present', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create(['name' => 'Specific Customer', 'type' => 'customer']);

    $this->get("/sales/create?customer_id={$customer->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sales/create')
            ->where('initialCustomer.id', $customer->id)
            ->where('initialCustomer.name', 'Specific Customer'));
});

test('saving a new sale goes back to the list, and the detail page still renders', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 5]);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'confirmed',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100]],
    ])->assertRedirect(route('sales.index'));

    $sale = Sale::query()->firstOrFail();

    // The list page right after saving carries the figures "Save & WhatsApp" needs, once.
    $this->get('/sales')->assertOk();

    $this->get("/sales/{$sale->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales/show')->where('sale.invoice_no', $sale->invoice_no));
});

test('the edit sale page renders for a draft sale', function () {
    $this->actingAs(User::factory()->create());
    $sale = Sale::factory()->create(['customer_id' => Contact::factory()]);

    $this->get("/sales/{$sale->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales/edit'));
});

test('a confirmed sale is amended, not freely edited: its edit page is closed to a historical record', function () {
    // A confirmed sale can be amended by someone who may edit sales (see AmendSaleTest); an imported historical record
    // has no stock or money behind it, so it stays closed.
    $this->actingAs(User::factory()->create());
    $sale = Sale::factory()->confirmed()->create(['customer_id' => Contact::factory(), 'source' => 'imported']);

    $this->get("/sales/{$sale->id}/edit")->assertForbidden();
});

test('a contact detail page lists their purchases and sales', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['type' => 'both']);
    $sale = Sale::factory()->create(['customer_id' => $contact->id, 'invoice_no' => 'INV-SALE-1']);

    $this->get("/contacts/{$contact->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('contacts/show')
            ->has('sales', 1)
            ->where('sales.0.invoice_no', $sale->invoice_no)
            ->has('purchases', 0));
});

test('the sales list defaults to today and shows only today\'s sales', function () {
    $this->actingAs(userWithPermissions(['sale.view_all']));
    $customer = Contact::factory()->create();
    Sale::factory()->create(['customer_id' => $customer->id, 'invoice_no' => 'INV-TODAY', 'sale_date' => today()]);
    Sale::factory()->create(['customer_id' => $customer->id, 'invoice_no' => 'INV-YESTERDAY', 'sale_date' => today()->subDay()]);

    $this->get('/sales')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.preset', 'today')
            ->where('filters.from', null)
            ->where('filters.to', null)
            ->has('sales.data', 1)
            ->where('sales.data.0.invoice_no', 'INV-TODAY'));
});

test('the sales list filters by preset, one specific date, a custom range, or all time', function () {
    $this->actingAs(userWithPermissions(['sale.view_all']));
    $customer = Contact::factory()->create();
    Sale::factory()->create(['customer_id' => $customer->id, 'invoice_no' => 'INV-TODAY', 'sale_date' => today()]);
    Sale::factory()->create(['customer_id' => $customer->id, 'invoice_no' => 'INV-YESTERDAY', 'sale_date' => today()->subDay()]);
    Sale::factory()->create(['customer_id' => $customer->id, 'invoice_no' => 'INV-OLD', 'sale_date' => '2020-01-15']);

    $this->get('/sales?preset=yesterday')
        ->assertInertia(fn ($page) => $page->has('sales.data', 1)->where('sales.data.0.invoice_no', 'INV-YESTERDAY'));

    // A single specific date is just a custom range with from = to.
    $this->get('/sales?preset=custom&from=2020-01-15&to=2020-01-15')
        ->assertInertia(fn ($page) => $page
            ->where('filters.preset', 'custom')
            ->where('filters.from', '2020-01-15')
            ->has('sales.data', 1)
            ->where('sales.data.0.invoice_no', 'INV-OLD'));

    $this->get('/sales?preset=custom&from=2020-01-01&to='.today()->toDateString())
        ->assertInertia(fn ($page) => $page->has('sales.data', 3));

    $this->get('/sales?preset=all')
        ->assertInertia(fn ($page) => $page->where('filters.preset', 'all')->has('sales.data', 3));
});

test('the add sale page can be opened with a product to start the cart with', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['is_for_sale' => true]);

    $this->get("/sales/create?product_id={$product->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales/create')->where('initialProductId', $product->id));

    $this->get('/sales/create')
        ->assertInertia(fn ($page) => $page->where('initialProductId', null));
});

test('a wrong serial on the add-sale form is reported on that line\'s serial field and saves nothing', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $plain = Product::factory()->create(['selling_price' => 100, 'current_stock' => 5]);
    $tracked = Product::factory()->create(['selling_price' => 200, 'current_stock' => 1, 'track_serial_number' => true]);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-10-05',
        'status' => 'confirmed',
        'items' => [
            ['product_id' => $plain->id, 'quantity' => 1, 'unit_price' => 100],
            ['product_id' => $tracked->id, 'quantity' => 1, 'unit_price' => 200, 'serial_numbers' => ['5000']],
        ],
    ])->assertSessionHasErrors(['items.1.serial_numbers']);

    // No half-made Draft is left behind, and stock is untouched.
    expect(Sale::query()->count())->toBe(0)
        ->and($plain->fresh()->current_stock)->toBe(5.0);
});
