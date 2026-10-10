<?php

use App\Enums\AccountTransactionType;
use App\Models\AccountTransaction;
use App\Models\Contact;
use App\Models\EmiInstallment;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());
    $this->travelTo(Carbon::parse('2026-10-14 10:00:00'));
    $this->sale = Sale::factory()->confirmed()->create(['customer_id' => Contact::factory()]);
});

function installment(Sale $sale, int $number, string $due, float $amount, float $paid = 0, string $status = 'pending'): EmiInstallment
{
    return EmiInstallment::factory()->create([
        'sale_id' => $sale->id,
        'installment_number' => $number,
        'due_date' => $due,
        'amount' => $amount,
        'paid_amount' => $paid,
        'status' => $status,
    ]);
}

function emiCash(float $amount, string $date): void
{
    AccountTransaction::factory()->create(['type' => AccountTransactionType::EmiPayment, 'amount' => $amount, 'operation_date' => $date]);
}

test('the monthly breakdown separates what is expected, collected and still owed, and flags the overdue part', function () {
    installment($this->sale, 1, '2026-10-05', 1000, 400);
    installment($this->sale, 2, '2026-11-05', 600);
    installment($this->sale, 3, '2026-10-20', 500, 0, 'cancelled');
    emiCash(400, '2026-10-10');
    emiCash(100, '2026-11-02');

    $this->get(route('emi-installments.index', ['group' => 'month', 'year' => 2026]))
        ->assertInertia(fn ($page) => $page
            ->where('collection.group', 'month')
            ->where('collection.rows.9.key', '2026-10')
            ->where('collection.rows.9.expected', 1000)
            ->where('collection.rows.9.collected', 400)
            ->where('collection.rows.9.remaining', 600)
            ->where('collection.rows.9.overdue', 600)
            ->where('collection.rows.9.is_current', true)
            ->where('collection.rows.10.expected', 600)
            ->where('collection.rows.10.collected', 100)
            ->where('collection.rows.10.overdue', 0)
            ->where('collection.totals.expected', 1600)
            ->where('collection.totals.collected', 500));
});

test('the headline shows overdue, due this week, due this month and collected this month', function () {
    installment($this->sale, 1, '2026-10-05', 1000, 400);   // overdue 600, due this month
    installment($this->sale, 2, '2026-10-16', 300);          // this week (Mon 12 – Sun 18 Oct) and this month
    installment($this->sale, 3, '2026-10-28', 200);          // this month only
    installment($this->sale, 4, '2026-11-05', 700);          // next month: nowhere in the headline
    installment($this->sale, 5, '2026-10-01', 900, 900, 'paid');
    emiCash(400, '2026-10-10');

    $this->get(route('emi-installments.index'))
        ->assertInertia(fn ($page) => $page
            ->where('headline.overdue', 600)
            ->where('headline.due_this_week', 300)
            ->where('headline.due_this_month', 1100)
            ->where('headline.collected_this_month', 400));
});

test('the weekly breakdown covers four weeks back to seven weeks ahead and counts cash in the week it was received', function () {
    installment($this->sale, 1, '2026-10-16', 300);
    emiCash(250, '2026-10-06');   // the previous week

    $this->get(route('emi-installments.index', ['group' => 'week']))
        ->assertInertia(fn ($page) => $page
            ->has('collection.rows', 12)
            ->where('collection.rows.3.key', '2026-10-05')
            ->where('collection.rows.3.collected', 250)
            ->where('collection.rows.4.key', '2026-10-12')
            ->where('collection.rows.4.expected', 300)
            ->where('collection.rows.4.is_current', true));
});

test('the yearly breakdown spans two years back to three ahead', function () {
    installment($this->sale, 1, '2027-03-01', 800);

    $this->get(route('emi-installments.index', ['group' => 'year']))
        ->assertInertia(fn ($page) => $page
            ->has('collection.rows', 6)
            ->where('collection.rows.0.key', '2024')
            ->where('collection.rows.3.key', '2027')
            ->where('collection.rows.3.expected', 800));
});

test('an unknown grouping is rejected', function () {
    $this->get(route('emi-installments.index', ['group' => 'decade']))->assertSessionHasErrors('group');
});
