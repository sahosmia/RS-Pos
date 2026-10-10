<?php

use App\Enums\EmiFrequency;
use App\Enums\EmiInterestMethod;
use App\Enums\EmiTenureUnit;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\EmiInstallment;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;
use App\Services\EmiCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Settings::factory()->create();
});

function emiCalc(): EmiCalculator
{
    return new EmiCalculator;
}

function calcSchedule(float $financed, EmiInterestMethod $method, float $rate, int $periods, EmiFrequency $frequency = EmiFrequency::Monthly, string $firstDue = '2026-11-06'): array
{
    return emiCalc()->calculate($financed, $method, $rate, $periods, $frequency, CarbonImmutable::parse($firstDue));
}

// ---- the maths --------------------------------------------------------------------------------------

test('flat interest is charged on the original amount for the whole tenure and installments are equal to the cent', function () {
    $result = calcSchedule(100000, EmiInterestMethod::Flat, 12, 12);

    expect($result['interest_total'])->toBe(12000.0)
        ->and($result['total_payable'])->toBe(112000.0)
        ->and($result['schedule'][0]['amount'])->toBe(9333.34)
        ->and($result['schedule'][0]['principal'])->toBe(8333.34)
        ->and($result['schedule'][0]['interest'])->toBe(1000.0)
        ->and($result['schedule'][11]['amount'])->toBe(9333.33)
        ->and(round(array_sum(array_column($result['schedule'], 'amount')), 2))->toBe(112000.0)
        ->and(round(array_sum(array_column($result['schedule'], 'principal')), 2))->toBe(100000.0)
        ->and($result['schedule'][11]['closing_balance'])->toBe(0.0);
});

test('reducing balance charges interest on what is still owed and the last installment clears the balance exactly', function () {
    $result = calcSchedule(100000, EmiInterestMethod::Reducing, 12, 12);

    expect($result['schedule'][0]['amount'])->toBe(8884.88)
        ->and($result['schedule'][0]['interest'])->toBe(1000.0)
        ->and($result['schedule'][1]['interest'])->toBe(921.15)
        ->and($result['interest_total'])->toBe(6618.53)
        ->and(round(array_sum(array_column($result['schedule'], 'principal')), 2))->toBe(100000.0)
        ->and($result['schedule'][11]['closing_balance'])->toBe(0.0);
});

test('no interest splits the financed amount evenly and a remainder cent goes to the earliest installments', function () {
    $result = calcSchedule(10000.01, EmiInterestMethod::None, 0, 3);

    expect(array_column($result['schedule'], 'amount'))->toBe([3333.34, 3333.34, 3333.33])
        ->and($result['interest_total'])->toBe(0.0)
        ->and($result['total_payable'])->toBe(10000.01);
});

test('an interest method with a zero rate behaves like no interest instead of dividing by zero', function () {
    foreach ([EmiInterestMethod::Flat, EmiInterestMethod::Reducing] as $method) {
        $result = calcSchedule(1200, $method, 0, 12);

        expect($result['interest_total'])->toBe(0.0)->and($result['schedule'][0]['amount'])->toBe(100.0);
    }
});

test('every method and frequency produces a schedule whose principal adds up exactly', function () {
    foreach ([EmiInterestMethod::None, EmiInterestMethod::Flat, EmiInterestMethod::Reducing] as $method) {
        foreach ([EmiFrequency::Weekly, EmiFrequency::Monthly, EmiFrequency::Quarterly] as $frequency) {
            foreach ([1, 3, 7, 13, 24] as $periods) {
                $result = calcSchedule(98765.43, $method, 14.75, $periods, $frequency);

                expect(round(array_sum(array_column($result['schedule'], 'principal')), 2))->toBe(98765.43)
                    ->and(end($result['schedule'])['closing_balance'])->toBe(0.0)
                    ->and(round(array_sum(array_column($result['schedule'], 'amount')), 2))->toBe($result['total_payable']);
            }
        }
    }
});

test('due dates are counted from the first due date so a month-end does not drift', function () {
    $result = calcSchedule(300, EmiInterestMethod::None, 0, 4, EmiFrequency::Monthly, '2027-01-31');
    expect(array_column($result['schedule'], 'due_date'))->toBe(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);

    $weekly = calcSchedule(300, EmiInterestMethod::None, 0, 3, EmiFrequency::Weekly, '2026-11-06');
    expect(array_column($weekly['schedule'], 'due_date'))->toBe(['2026-11-06', '2026-11-13', '2026-11-20']);

    $quarterly = calcSchedule(300, EmiInterestMethod::None, 0, 3, EmiFrequency::Quarterly, '2026-11-30');
    expect(array_column($quarterly['schedule'], 'due_date'))->toBe(['2026-11-30', '2027-02-28', '2027-05-30']);
});

test('a duration in any unit converts to the right number of installments', function (int $value, string $unit, string $frequency, int $expected) {
    expect(emiCalc()->periodsFor($value, EmiTenureUnit::from($unit), EmiFrequency::from($frequency)))->toBe($expected);
})->with([
    [12, 'months', 'monthly', 12],
    [1, 'years', 'monthly', 12],
    [2, 'years', 'quarterly', 8],
    [52, 'weeks', 'monthly', 12],
    [6, 'months', 'weekly', 26],
    [365, 'days', 'monthly', 12],
    [90, 'days', 'monthly', 3],
    [10, 'days', 'monthly', 1],
    [36, 'months', 'monthly', 36],
]);

test('a financed amount of zero or no installments is rejected', function () {
    expect(fn () => calcSchedule(0, EmiInterestMethod::Flat, 12, 12))->toThrow(InvalidArgumentException::class)
        ->and(fn () => calcSchedule(100, EmiInterestMethod::Flat, 12, 0))->toThrow(InvalidArgumentException::class);
});

// ---- the preview endpoint ---------------------------------------------------------------------------

test('the calculator endpoint returns the price with interest, the installment and the schedule', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson(route('emi.calculate', [
        'sale_total' => 125000, 'down_payment' => 25000, 'method' => 'flat', 'annual_rate' => 12,
        'tenure_value' => 12, 'tenure_unit' => 'months', 'frequency' => 'monthly', 'sale_date' => '2026-10-06',
    ]))->assertOk()->assertJson([
        'periods' => 12,
        'principal' => 100000,
        'interest_total' => 12000,
        'total_payable' => 112000,
        'grand_total' => 137000,
        'installment_amount' => 9333.34,
        'first_due_date' => '2026-11-06',
        'tenure_adjusted' => false,
    ])->assertJsonCount(12, 'schedule');
});

test('the calculator endpoint flags a duration that had to be rounded up', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson(route('emi.calculate', ['sale_total' => 1000, 'method' => 'none', 'tenure_value' => 100, 'tenure_unit' => 'days', 'frequency' => 'monthly']))
        ->assertOk()->assertJson(['periods' => 4, 'tenure_adjusted' => true]);
});

test('the calculator endpoint rejects bad input with a clear message', function (array $query, string $field) {
    $this->actingAs(User::factory()->create());

    $this->getJson(route('emi.calculate', $query))->assertUnprocessable()->assertJsonValidationErrors($field);
})->with([
    'down payment equal to the price' => [['sale_total' => 1000, 'down_payment' => 1000, 'tenure_value' => 6, 'tenure_unit' => 'months'], 'down_payment'],
    'interest method without a rate' => [['sale_total' => 1000, 'method' => 'flat', 'tenure_value' => 6, 'tenure_unit' => 'months'], 'annual_rate'],
    'zero rate for an interest method' => [['sale_total' => 1000, 'method' => 'reducing', 'annual_rate' => 0, 'tenure_value' => 6, 'tenure_unit' => 'months'], 'annual_rate'],
    'no duration' => [['sale_total' => 1000, 'method' => 'none'], 'tenure_value'],
    'an absurd number of installments' => [['sale_total' => 1000, 'method' => 'none', 'tenure_value' => 60, 'tenure_unit' => 'years', 'frequency' => 'weekly'], 'tenure_value'],
]);

// ---- selling on EMI with interest ---------------------------------------------------------------------

function emiSale(array $overrides = [], float $down = 0): Sale
{
    test()->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000, 'current_stock' => 100, 'avg_cost' => 600]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    test()->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-10-06',
        'status' => 'confirmed',
        'financing_type' => 'emi',
        'emi_interest_method' => 'flat',
        'emi_annual_rate' => 12,
        'emi_tenure_value' => 12,
        'emi_tenure_unit' => 'months',
        'emi_frequency' => 'monthly',
        'items' => [['product_id' => $product->id, 'quantity' => 100, 'unit_price' => 1250]],
        'payments' => $down > 0 ? [['account_id' => $account->id, 'amount' => $down]] : [],
        ...$overrides,
    ])->assertSessionHasNoErrors()->assertRedirect();

    return Sale::query()->latest('id')->firstOrFail();
}

test('confirming an EMI sale with interest adds the interest to the total and schedules the interest-bearing installments', function () {
    $sale = emiSale(down: 25000);   // price 125,000, down payment 25,000 -> financed 100,000

    $installments = EmiInstallment::where('sale_id', $sale->id)->orderBy('installment_number')->get();

    expect($sale->total_amount)->toBe(137000.0)
        ->and($sale->emi_interest_total)->toBe(12000.0)
        ->and($sale->installment_count)->toBe(12)
        ->and($sale->paid_amount)->toBe(25000.0)
        ->and($sale->due_amount)->toBe(112000.0)
        ->and($installments)->toHaveCount(12)
        ->and($installments[0]->due_date->toDateString())->toBe('2026-11-06')
        ->and($installments[0]->amount)->toBe(9333.34)
        ->and($installments[0]->principal_amount)->toBe(8333.34)
        ->and($installments[0]->interest_amount)->toBe(1000.0)
        ->and(round($installments->sum('amount'), 2))->toBe(112000.0)
        ->and(round($installments->sum('interest_amount'), 2))->toBe(12000.0);
});

test('the journal credits sales revenue for the goods only and the interest to other income, and stays balanced', function () {
    $sale = emiSale(down: 25000);

    $entry = JournalEntry::where('reference_type', 'sale')->where('reference_id', $sale->id)->firstOrFail();
    $creditTo = fn (string $code) => (float) $entry->lines->where('chart_of_account_id', ChartOfAccount::where('code', $code)->value('id'))->sum('credit');

    expect($creditTo('4100'))->toBe(125000.0)
        ->and($creditTo('4400'))->toBe(12000.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('the customer owes the goods plus interest minus the down payment', function () {
    $sale = emiSale(down: 25000);

    expect($sale->customer->fresh()->balance)->toBe(112000.0);
});

test('paying every installment clears the sale including interest', function () {
    $sale = emiSale(down: 25000);
    $account = Account::query()->first();

    foreach (EmiInstallment::where('sale_id', $sale->id)->orderBy('installment_number')->get() as $installment) {
        $this->post(route('emi-installments.pay', $installment->id), ['account_id' => $account->id, 'amount' => $installment->amount])->assertRedirect();
    }

    expect($sale->fresh()->due_amount)->toBe(0.0)
        ->and($sale->fresh()->payment_status->value)->toBe('paid');
});

test('an EMI sale with no interest keeps the total unchanged', function () {
    $sale = emiSale(['emi_interest_method' => 'none', 'emi_annual_rate' => 0, 'emi_tenure_value' => 5, 'emi_tenure_unit' => 'months'], down: 25000);

    expect($sale->total_amount)->toBe(125000.0)
        ->and($sale->emi_interest_total)->toBe(0.0)
        ->and(EmiInstallment::where('sale_id', $sale->id)->count())->toBe(5)
        ->and(round((float) EmiInstallment::where('sale_id', $sale->id)->sum('amount'), 2))->toBe(100000.0);
});

test('weekly installments over a duration given in weeks are scheduled a week apart', function () {
    $sale = emiSale(['emi_interest_method' => 'none', 'emi_tenure_value' => 8, 'emi_tenure_unit' => 'weeks', 'emi_frequency' => 'weekly'], down: 25000);

    $dates = EmiInstallment::where('sale_id', $sale->id)->orderBy('installment_number')->pluck('due_date')->map->toDateString()->all();

    expect($dates)->toHaveCount(8)->and($dates[0])->toBe('2026-10-13')->and($dates[7])->toBe('2026-12-01');
});

test('a sale saved as a draft keeps its terms but schedules and charges nothing until it is confirmed', function () {
    $sale = emiSale(['status' => 'draft']);

    expect($sale->total_amount)->toBe(125000.0)
        ->and($sale->emi_interest_total)->toBe(0.0)
        ->and($sale->emi_interest_method)->toBe('flat')
        ->and($sale->installment_count)->toBe(12)
        ->and(EmiInstallment::where('sale_id', $sale->id)->count())->toBe(0);
});

test('the sale ignores a client-sent installment count when a duration is given', function () {
    $sale = emiSale(['installment_count' => 99], down: 25000);

    expect($sale->installment_count)->toBe(12);
});

test('a duration that would create too many installments is rejected before anything is saved', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['selling_price' => 100, 'current_stock' => 10]);

    $this->post('/sales', [
        'customer_id' => Contact::factory()->create()->id,
        'sale_date' => '2026-10-06', 'status' => 'confirmed', 'financing_type' => 'emi',
        'emi_interest_method' => 'none', 'emi_tenure_value' => 60, 'emi_tenure_unit' => 'years', 'emi_frequency' => 'weekly',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100]],
    ])->assertSessionHasErrors('emi_tenure_value');

    expect(Sale::count())->toBe(0);
});

// ---- installation is paid now, never financed ----------------------------------------------------------

function emiSaleWithInstallation(float $paid, array $overrides = []): Sale
{
    test()->actingAs(User::factory()->create());
    $product = Product::factory()->create(['selling_price' => 1250, 'current_stock' => 100, 'avg_cost' => 600]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    test()->post('/sales', [
        'customer_id' => Contact::factory()->create()->id,
        'sale_date' => '2026-10-06',
        'status' => 'confirmed',
        'financing_type' => 'emi',
        'emi_interest_method' => 'flat',
        'emi_annual_rate' => 12,
        'emi_tenure_value' => 12,
        'emi_tenure_unit' => 'months',
        'emi_frequency' => 'monthly',
        // 100 x 1,250 = 125,000 of goods plus a 5,000 installation charge.
        'items' => [['product_id' => $product->id, 'quantity' => 100, 'unit_price' => 1250, 'installation_required' => true, 'installation_charge' => 5000]],
        'payments' => $paid > 0 ? [['account_id' => $account->id, 'amount' => $paid]] : [],
        ...$overrides,
    ])->assertSessionHasNoErrors()->assertRedirect();

    return Sale::query()->latest('id')->firstOrFail();
}

test('money paid at confirm is a down payment on the goods and the installation stays a separate due, never financed', function () {
    // 25,000 down on 125,000 of goods -> 100,000 financed. The 5,000 installation is billed but not in the installments.
    $sale = emiSaleWithInstallation(25000);

    expect($sale->installation_amount)->toBe(5000.0)
        ->and($sale->emi_interest_total)->toBe(12000.0)
        ->and($sale->total_amount)->toBe(142000.0)
        ->and($sale->due_amount)->toBe(117000.0)
        ->and(round((float) EmiInstallment::where('sale_id', $sale->id)->sum('amount'), 2))->toBe(112000.0)
        ->and(EmiInstallment::where('sale_id', $sale->id)->count())->toBe(12);
});
test('collecting the installation up front lets the payment cover it first and only the rest is the down payment', function () {
    // 30,000 received = 5,000 installation + 25,000 down payment on the goods -> 100,000 financed.
    $sale = emiSaleWithInstallation(30000, ['emi_installation_upfront' => true]);

    expect($sale->emi_installation_upfront)->toBeTrue()
        ->and($sale->emi_interest_total)->toBe(12000.0)
        ->and($sale->total_amount)->toBe(142000.0)
        ->and($sale->paid_amount)->toBe(30000.0)
        ->and($sale->due_amount)->toBe(112000.0)
        ->and(round((float) EmiInstallment::where('sale_id', $sale->id)->sum('amount'), 2))->toBe(112000.0);
});

test('without the up-front option the same 30,000 is all down payment on the goods', function () {
    $sale = emiSaleWithInstallation(30000);

    // 125,000 - 30,000 = 95,000 financed: flat 12% for a year = 11,400.
    expect($sale->emi_installation_upfront)->toBeFalse()
        ->and($sale->emi_interest_total)->toBe(11400.0)
        ->and($sale->due_amount)->toBe($sale->total_amount - 30000);
});

test('the up-front option is saved with the sale and read back for editing', function () {
    $sale = emiSaleWithInstallation(0, ['status' => 'draft', 'emi_installation_upfront' => true]);

    $this->get(route('sales.edit', $sale))->assertInertia(fn ($page) => $page->where('sale.emi_installation_upfront', true));
});
test('with no down payment the whole goods amount is financed and the installation is still a plain due', function () {
    $sale = emiSaleWithInstallation(0);

    // Interest is on the 125,000 of goods only (12% flat for a year = 15,000), never on the 5,000 installation.
    expect($sale->emi_interest_total)->toBe(15000.0)
        ->and($sale->total_amount)->toBe(145000.0)
        ->and($sale->due_amount)->toBe(145000.0)
        ->and(round((float) EmiInstallment::where('sale_id', $sale->id)->sum('amount'), 2))->toBe(140000.0);
});

test('the calculator keeps the installation out of the financed amount and out of the interest', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson(route('emi.calculate', [
        'sale_total' => 130000, 'installation' => 5000, 'down_payment' => 25000, 'method' => 'flat', 'annual_rate' => 12,
        'tenure_value' => 12, 'tenure_unit' => 'months', 'frequency' => 'monthly', 'sale_date' => '2026-10-06',
    ]))->assertOk()->assertJson([
        'principal' => 100000,
        'interest_total' => 12000,
        'installation' => 5000,
        'grand_total' => 142000,
    ]);
});

test('the down payment must be below the price of the goods, not the total with installation', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson(route('emi.calculate', ['sale_total' => 1000, 'installation' => 200, 'down_payment' => 800, 'method' => 'none', 'tenure_value' => 6, 'tenure_unit' => 'months']))
        ->assertUnprocessable()->assertJsonValidationErrors('down_payment');
});

// ---- product-specific EMI: only some lines are financed -----------------------------------------------

/** AC 100,000 on EMI; wiring 5,000 and pipe 3,000 paid now; 2,000 installation on the AC. */
function mixedEmiSale(float $paid, array $overrides = [], array $itemOverrides = []): Sale
{
    test()->actingAs(User::factory()->create());
    $ac = Product::factory()->create(['selling_price' => 100000, 'current_stock' => 10, 'avg_cost' => 70000]);
    $wiring = Product::factory()->create(['selling_price' => 5000, 'current_stock' => 10, 'avg_cost' => 3000]);
    $pipe = Product::factory()->create(['selling_price' => 3000, 'current_stock' => 10, 'avg_cost' => 2000]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    test()->post('/sales', [
        'customer_id' => Contact::factory()->create()->id,
        'sale_date' => '2026-10-06',
        'status' => 'confirmed',
        'financing_type' => 'emi',
        'emi_interest_method' => 'flat',
        'emi_annual_rate' => 12,
        'emi_tenure_value' => 12,
        'emi_tenure_unit' => 'months',
        'emi_frequency' => 'monthly',
        'items' => [
            ['product_id' => $ac->id, 'quantity' => 1, 'unit_price' => 100000, 'installation_required' => true, 'installation_charge' => 2000, 'emi_financed' => true, ...$itemOverrides[0] ?? []],
            ['product_id' => $wiring->id, 'quantity' => 1, 'unit_price' => 5000, 'emi_financed' => false],
            ['product_id' => $pipe->id, 'quantity' => 1, 'unit_price' => 3000, 'emi_financed' => false],
        ],
        'payments' => $paid > 0 ? [['account_id' => $account->id, 'amount' => $paid]] : [],
        ...$overrides,
    ])->assertSessionHasNoErrors()->assertRedirect();

    return Sale::query()->latest('id')->firstOrFail();
}

test('only the products chosen for EMI are financed and charged interest; the rest of the invoice is paid now', function () {
    // 28,000 paid = 8,000 for the wiring and pipe + 20,000 down payment on the AC -> 80,000 financed.
    $sale = mixedEmiSale(28000);

    expect($sale->items()->where('emi_financed', true)->count())->toBe(1)
        ->and($sale->emiFinancedGoods())->toBe(100000.0)
        ->and($sale->emi_interest_total)->toBe(9600.0)                 // 12% flat on 80,000 for a year
        ->and($sale->total_amount)->toBe(119600.0)                      // 108,000 goods + 2,000 installation + interest
        ->and($sale->paid_amount)->toBe(28000.0)
        ->and($sale->due_amount)->toBe(91600.0)
        ->and(round((float) EmiInstallment::where('sale_id', $sale->id)->sum('amount'), 2))->toBe(89600.0)   // 80,000 + 9,600
        ->and($sale->installation_amount)->toBe(2000.0);                // the 2,000 installation is still just a due
});

test('everything is one invoice, with one journal entry that stays balanced and credits interest to other income', function () {
    $sale = mixedEmiSale(28000);

    $entries = JournalEntry::where('reference_type', 'sale')->where('reference_id', $sale->id)->get();
    $entry = $entries->first();
    $creditTo = fn (string $code) => (float) $entry->lines->where('chart_of_account_id', ChartOfAccount::where('code', $code)->value('id'))->sum('credit');

    expect(Sale::count())->toBe(1)
        ->and($sale->items()->count())->toBe(3)
        ->and($entries)->toHaveCount(1)
        ->and($creditTo('4100'))->toBe(110000.0)                        // 108,000 goods + 2,000 installation
        ->and($creditTo('4400'))->toBe(9600.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('money paid covers the pay-now products first; if less is paid the whole EMI product is financed and the rest stays due', function () {
    $sale = mixedEmiSale(5000);   // not even the 8,000 of wiring and pipe is covered

    expect($sale->emi_interest_total)->toBe(12000.0)                    // 12% flat on the full 100,000
        ->and(round((float) EmiInstallment::where('sale_id', $sale->id)->sum('amount'), 2))->toBe(112000.0)
        ->and($sale->due_amount)->toBe($sale->total_amount - 5000);
});

test('with the up-front option the installation is covered right after the pay-now products', function () {
    // 30,000 = 8,000 pay-now products + 2,000 installation + 20,000 down payment on the AC -> 80,000 financed.
    $sale = mixedEmiSale(30000, ['emi_installation_upfront' => true]);

    expect($sale->emi_interest_total)->toBe(9600.0)
        ->and($sale->due_amount)->toBe(89600.0);
});

test('an invoice discount is shared across the lines so the EMI part and the pay-now part add up', function () {
    // 108,000 of goods, 10% off = 10,800. The AC carries 100,000/108,000 of it (10,000) -> 90,000 on EMI, 7,200 paid now.
    $sale = mixedEmiSale(0, ['discount_type' => 'flat', 'discount_value' => 10800]);

    expect($sale->emiFinancedGoods())->toBe(90000.0)
        ->and($sale->emi_interest_total)->toBe(10800.0)                 // 12% flat on 90,000
        ->and(round((float) EmiInstallment::where('sale_id', $sale->id)->sum('amount'), 2))->toBe(100800.0);
});

test('a line left out of EMI is remembered and read back when the sale is edited', function () {
    $sale = mixedEmiSale(0, ['status' => 'draft']);

    $this->get(route('sales.edit', $sale))->assertInertia(fn ($page) => $page
        ->where('sale.items.0.emi_financed', true)
        ->where('sale.items.1.emi_financed', false)
        ->where('sale.items.2.emi_financed', false));
});

test('an EMI sale needs at least one product on EMI', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['selling_price' => 1000, 'current_stock' => 10]);

    $this->post('/sales', [
        'customer_id' => Contact::factory()->create()->id,
        'sale_date' => '2026-10-06', 'status' => 'confirmed', 'financing_type' => 'emi',
        'emi_interest_method' => 'none', 'emi_tenure_value' => 6, 'emi_tenure_unit' => 'months', 'emi_frequency' => 'monthly',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000, 'emi_financed' => false]],
    ])->assertSessionHasErrors('items');

    expect(Sale::count())->toBe(0);
});

test('lines default to being on EMI, so a sale that never chooses behaves exactly as before', function () {
    $sale = emiSale(down: 25000);

    expect($sale->items()->where('emi_financed', false)->count())->toBe(0)
        ->and($sale->emi_interest_total)->toBe(12000.0);
});

test('the calculator quotes only the EMI products and reports what is paid now', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson(route('emi.calculate', [
        'sale_total' => 110000, 'installation' => 2000, 'financed_goods' => 100000, 'down_payment' => 20000, 'method' => 'flat', 'annual_rate' => 12,
        'tenure_value' => 12, 'tenure_unit' => 'months', 'frequency' => 'monthly', 'sale_date' => '2026-10-06',
    ]))->assertOk()->assertJson([
        'principal' => 80000,
        'interest_total' => 9600,
        'financed_goods' => 100000,
        'cash_goods' => 8000,
        'installation' => 2000,
        'grand_total' => 119600,
    ]);
});

test('the down payment must be below the price of the EMI products, not the whole invoice', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson(route('emi.calculate', ['sale_total' => 110000, 'installation' => 2000, 'financed_goods' => 100000, 'down_payment' => 100000, 'method' => 'none', 'tenure_value' => 6, 'tenure_unit' => 'months']))
        ->assertUnprocessable()->assertJsonValidationErrors('down_payment');
});
test('the interest is never read back as installation on the invoice', function () {
    $sale = emiSale(down: 25000);   // interest 12,000 and no installation

    $this->get(route('sales.show', $sale))->assertInertia(fn ($page) => $page
        ->where('sale.installation_amount', 0)
        ->where('sale.subtotal', 125000)
        ->where('sale.total_amount', 137000));
});

test('the invoice page lists the installments and which one is next', function () {
    $sale = emiSale(down: 25000);

    $this->get(route('sales.show', $sale))->assertInertia(fn ($page) => $page
        ->where('sale.emi.interest_total', 12000)
        ->where('sale.emi.installments_total', 12)
        ->where('sale.emi.installments_open', 12)
        ->where('sale.emi.next.number', 1)
        ->where('sale.emi.next.due_date', '2026-11-06')
        ->where('sale.emi.next.remaining', 9333.34)
        ->has('sale.emi.installments', 12));
});

test('a sale that is not on EMI has no installment block', function () {
    $this->actingAs(User::factory()->create());
    $sale = Sale::factory()->confirmed()->create(['customer_id' => Contact::factory()]);

    $this->get(route('sales.show', $sale))->assertInertia(fn ($page) => $page->where('sale.emi', null));
});

test('the invoice and invoice settings pages keep the shared shop props the sidebar reads, and carry the invoice header separately', function () {
    // The sidebar builds the EMI menu from the shared `shop.emi_module_enabled`; a page prop also called `shop` hid it.
    Settings::query()->update(['emi_module_enabled' => true, 'shop_name' => 'My Fridge Shop']);
    Cache::flush();
    $this->actingAs(User::factory()->create());
    $sale = Sale::factory()->create();

    $this->get(route('sales.show', $sale))->assertOk()->assertInertia(fn ($page) => $page
        ->where('shop.emi_module_enabled', true)
        ->where('invoiceShop.name', 'My Fridge Shop'));

    $this->get(route('invoice-settings.edit'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('shop.emi_module_enabled', true)
        ->where('invoiceShop.name', 'My Fridge Shop'));
});

test('the dashboard lists overdue and soon-due installments and warranties about to end, with real totals', function () {
    Settings::query()->update(['emi_module_enabled' => true]);
    Cache::flush();
    $this->actingAs(User::factory()->create());

    $customer = Contact::factory()->create(['name' => 'Rahim Uddin', 'phone' => '01711000000']);
    $sale = Sale::factory()->create(['customer_id' => $customer->id, 'invoice_no' => 'INV-0100']);
    $sale->forceFill(['status' => 'confirmed'])->save();
    EmiInstallment::create(['sale_id' => $sale->id, 'installment_number' => 1, 'due_date' => today()->subDays(3), 'amount' => 1000, 'paid_amount' => 400, 'status' => 'overdue']);
    EmiInstallment::create(['sale_id' => $sale->id, 'installment_number' => 2, 'due_date' => today()->addDays(4), 'amount' => 1000, 'paid_amount' => 0, 'status' => 'pending']);
    EmiInstallment::create(['sale_id' => $sale->id, 'installment_number' => 3, 'due_date' => today()->addDays(40), 'amount' => 1000, 'paid_amount' => 0, 'status' => 'pending']);

    $product = Product::factory()->create(['name' => 'Split AC']);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'original_price' => 1000, 'unit_price' => 1000, 'subtotal' => 1000, 'warranty_expires_at' => today()->addDays(10)]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'original_price' => 1000, 'unit_price' => 1000, 'subtotal' => 1000, 'warranty_expires_at' => today()->addDays(90)]);

    $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
        ->where('followUps.emi.overdue_count', 1)
        ->where('followUps.emi.overdue_amount', 600)      // 1,000 less the 400 already paid
        ->where('followUps.emi.due_soon_count', 1)        // the one in 4 days; the one in 40 days is not yet
        ->where('followUps.emi.due_soon_amount', 1000)
        ->where('followUps.emi.items.0.customer', 'Rahim Uddin')
        ->where('followUps.warranties.count', 1)          // 10 days yes, 90 days no
        ->where('followUps.warranties.items.0.product', 'Split AC'));
});

test('the installments list finds an installment by the customer phone number and sends the phone for display', function () {
    $this->actingAs(User::factory()->create());
    $rahim = Contact::factory()->create(['name' => 'Rahim', 'phone' => '01711223344']);
    $karim = Contact::factory()->create(['name' => 'Karim', 'phone' => '01899887766']);

    foreach ([$rahim, $karim] as $customer) {
        $sale = Sale::factory()->create(['customer_id' => $customer->id]);
        $sale->forceFill(['status' => 'confirmed'])->save();
        EmiInstallment::create(['sale_id' => $sale->id, 'installment_number' => 1, 'due_date' => today()->addDays(5), 'amount' => 500, 'paid_amount' => 0, 'status' => 'pending']);
    }

    $this->get('/emi-installments?search=0171122')->assertOk()->assertInertia(fn ($page) => $page
        ->has('installments.data', 1)
        ->where('installments.data.0.customer.name', 'Rahim')
        ->where('installments.data.0.customer.phone', '01711223344'));
});

test('the dashboard no longer carries a setup checklist', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/dashboard')->assertInertia(fn ($page) => $page->missing('setupSteps'));
});
