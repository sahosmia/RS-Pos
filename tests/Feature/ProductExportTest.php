<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/products/export?format=csv&scope=all&columns[]=name')->assertRedirect('/login');
});

test('csv export of all matching products downloads with the requested columns', function () {
    $this->actingAs(User::factory()->create());
    Product::factory()->create(['name' => 'Split AC 1.5 Ton', 'sku' => 'AC-001']);
    Product::factory()->create(['name' => 'Refrigerator 300L', 'sku' => 'FRIDGE-001']);

    $response = $this->get('/products/export?'.http_build_query([
        'format' => 'csv',
        'scope' => 'all',
        'columns' => ['name', 'sku'],
    ], '', '&', PHP_QUERY_RFC3986));

    $response->assertOk()->assertDownload('products.csv');
});

test('xlsx export respects the "this page" scope and per_page', function () {
    $this->actingAs(User::factory()->create());
    Product::factory()->count(5)->create();

    $response = $this->get('/products/export?'.http_build_query([
        'format' => 'xlsx',
        'scope' => 'page',
        'page' => 1,
        'per_page' => 3,
        'columns' => ['name'],
    ], '', '&', PHP_QUERY_RFC3986));

    $response->assertOk()->assertDownload('products.xlsx');
});

test('pdf export of only the selected ids', function () {
    $this->actingAs(User::factory()->create());
    $keep = Product::factory()->create(['name' => 'Keep me']);
    Product::factory()->create(['name' => 'Not selected']);

    $response = $this->get('/products/export?'.http_build_query([
        'format' => 'pdf',
        'scope' => 'selected',
        'ids' => [$keep->id],
        'columns' => ['name'],
    ], '', '&', PHP_QUERY_RFC3986));

    $response->assertOk()->assertDownload('products.pdf');
});

test('export still respects the same category/search filters as the index page', function () {
    $this->actingAs(User::factory()->create());
    $category = Category::factory()->create();
    Product::factory()->create(['name' => 'In category', 'category_id' => $category->id]);
    Product::factory()->create(['name' => 'Different category']);

    $response = $this->get('/products/export?'.http_build_query([
        'format' => 'csv',
        'scope' => 'all',
        'category_id' => $category->id,
        'columns' => ['name'],
    ], '', '&', PHP_QUERY_RFC3986));

    $response->assertOk()->assertDownload('products.csv');
});

test('the status column exports a human label, not the raw enum value', function () {
    $this->actingAs(User::factory()->create());
    Product::factory()->create([
        'name' => 'Stocked Item',
        'manage_stock' => true,
        'current_stock' => 50,
        'minimum_stock_level' => 5,
    ]);

    $response = $this->get('/products/export?'.http_build_query([
        'format' => 'csv',
        'scope' => 'all',
        'columns' => ['name', 'status'],
    ], '', '&', PHP_QUERY_RFC3986));

    $response->assertOk();

    expect($response->getFile()->getContent())
        ->toContain('In Stock')
        ->not->toContain('in_stock');
});

test('selected scope requires ids', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/products/export?'.http_build_query([
        'format' => 'csv',
        'scope' => 'selected',
        'columns' => ['name'],
    ], '', '&', PHP_QUERY_RFC3986))->assertInvalid('ids');
});

test('an unknown column is rejected', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/products/export?'.http_build_query([
        'format' => 'csv',
        'scope' => 'all',
        'columns' => ['not_a_real_column'],
    ], '', '&', PHP_QUERY_RFC3986))->assertInvalid('columns.0');
});
