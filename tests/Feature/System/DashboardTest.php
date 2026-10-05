<?php

use App\Models\Expense;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Support\Carbon;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    Settings::factory()->create();
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')->assertOk();
});

test('it defaults to today and only counts confirmed/received records inside the range', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $today = Carbon::today();
    Sale::factory()->confirmed()->create(['sale_date' => $today, 'total_amount' => 1000, 'due_amount' => 400]);
    Sale::factory()->confirmed()->create(['sale_date' => $today->copy()->subDays(5), 'total_amount' => 5000, 'due_amount' => 0]);
    Sale::factory()->create(['sale_date' => $today, 'status' => 'draft', 'total_amount' => 9999, 'due_amount' => 9999]);
    SaleReturn::factory()->create(['return_date' => $today, 'total_amount' => 100]);

    Purchase::factory()->received()->create(['purchase_date' => $today, 'total_amount' => 700, 'due_amount' => 200]);
    PurchaseReturn::factory()->create(['return_date' => $today, 'total_amount' => 50]);
    Expense::factory()->create(['expense_date' => $today, 'total_amount' => 300]);

    $this->get('/dashboard')->assertInertia(fn ($page) => $page
        ->where('range.preset', 'today')
        ->where('metrics.totalSales', 1000)
        ->where('metrics.netSales', 900)
        ->where('metrics.invoiceDue', 400)
        ->where('metrics.totalSellReturn', 100)
        ->where('metrics.totalPurchase', 700)
        ->where('metrics.purchaseDue', 200)
        ->where('metrics.totalPurchaseReturn', 50)
        ->where('metrics.totalExpense', 300));
});

test('a preset expands the range and excludes records outside it', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $today = Carbon::today();
    Sale::factory()->confirmed()->create(['sale_date' => $today->copy()->subDays(3), 'total_amount' => 250, 'due_amount' => 0]);
    Sale::factory()->confirmed()->create(['sale_date' => $today->copy()->subDays(10), 'total_amount' => 9999, 'due_amount' => 0]);

    $this->get('/dashboard?preset=last_7_days')->assertInertia(fn ($page) => $page
        ->where('range.preset', 'last_7_days')
        ->where('range.from', $today->copy()->subDays(6)->toDateString())
        ->where('range.to', $today->toDateString())
        ->where('metrics.totalSales', 250));
});

test('the last-30-days and current-fiscal-year sales charts group confirmed sales correctly', function () {
    Carbon::setTestNow('2026-09-25');
    Settings::factory()->create(['fiscal_year_start_month' => 7]);
    $this->actingAs(User::factory()->create());

    Sale::factory()->confirmed()->create(['sale_date' => '2026-09-25', 'total_amount' => 100]);
    Sale::factory()->confirmed()->create(['sale_date' => '2026-09-15', 'total_amount' => 200]);
    // Outside the 30-day window (Aug 27–Sep 25) but still inside the fiscal year (Jul 2026–Jun 2027).
    Sale::factory()->confirmed()->create(['sale_date' => '2026-08-01', 'total_amount' => 500]);
    Sale::factory()->create(['sale_date' => '2026-09-25', 'status' => 'draft', 'total_amount' => 9999]);

    $this->get('/dashboard')->assertInertia(fn ($page) => $page
        ->has('salesLast30Days', 30)
        ->has('salesCurrentFiscalYear', 12)
        ->where('salesLast30Days.29.date', '2026-09-25')
        ->where('salesLast30Days.29.total', 100)
        ->where('salesLast30Days.19.date', '2026-09-15')
        ->where('salesLast30Days.19.total', 200)
        // Fiscal year starts July 2026 → index 0 = Jul, 1 = Aug, 2 = Sep.
        ->where('salesCurrentFiscalYear.1.month', '2026-08')
        ->where('salesCurrentFiscalYear.1.total', 500)
        ->where('salesCurrentFiscalYear.2.month', '2026-09')
        ->where('salesCurrentFiscalYear.2.total', 300));

    Carbon::setTestNow();
});

test('a custom range needs both dates and rejects an invalid one', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->get('/dashboard?preset=custom')->assertSessionHasErrors(['from', 'to']);
    $this->get('/dashboard?preset=custom&from=2026-01-10&to=2026-01-01')->assertSessionHasErrors('to');
    $this->get('/dashboard?preset=not_a_real_preset')->assertSessionHasErrors('preset');

    $this->get('/dashboard?preset=custom&from=2026-01-01&to=2026-01-31')
        ->assertInertia(fn ($page) => $page->where('range.from', '2026-01-01')->where('range.to', '2026-01-31'));
});

test('the revenue-vs-expense chart sums confirmed sales and expenses per month of the fiscal year', function () {
    Carbon::setTestNow('2026-09-25');
    Settings::factory()->create(['fiscal_year_start_month' => 7]);
    $this->actingAs(User::factory()->create());

    // two sales on the same day plus one later in the month must add up, drafts and other fiscal years must not
    Sale::factory()->confirmed()->create(['sale_date' => '2026-08-03', 'total_amount' => 100]);
    Sale::factory()->confirmed()->create(['sale_date' => '2026-08-03', 'total_amount' => 150]);
    Sale::factory()->confirmed()->create(['sale_date' => '2026-08-20', 'total_amount' => 250]);
    Sale::factory()->create(['sale_date' => '2026-08-03', 'status' => 'draft', 'total_amount' => 9999]);
    Sale::factory()->confirmed()->create(['sale_date' => '2025-08-03', 'total_amount' => 7777]);
    Expense::factory()->create(['expense_date' => '2026-08-10', 'total_amount' => 40]);
    Expense::factory()->create(['expense_date' => '2026-08-11', 'total_amount' => 60]);

    $this->get('/dashboard')->assertInertia(fn ($page) => $page
        ->has('monthlyRevenueVsExpense', 12)
        ->where('monthlyRevenueVsExpense.1.month', '2026-08')
        ->where('monthlyRevenueVsExpense.1.revenue', 500)
        ->where('monthlyRevenueVsExpense.1.expense', 100)
        ->where('monthlyRevenueVsExpense.0.revenue', 0));

    Carbon::setTestNow();
});
