<?php

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Product;
use App\Models\Settings;
use App\Models\User;
use Spatie\Activitylog\Models\Activity;

beforeEach(function () {
    Settings::factory()->create();
});

test('the activity log page needs the activity_log.view permission', function () {
    $this->get('/activity-log')->assertRedirect('/login');

    $this->actingAs(userWithPermissions([]))->get('/activity-log')->assertForbidden();

    $this->actingAs(userWithPermissions(['activity_log.view']))->get('/activity-log')->assertOk();
});

test('it lists who changed what, with old and new values, newest first', function () {
    $author = User::factory()->create(['name' => 'Rahim']);
    $this->actingAs($author);

    $product = Product::factory()->create(['name' => 'Split AC', 'selling_price' => 500]);
    $product->update(['selling_price' => 550]);

    $viewer = userWithPermissions(['activity_log.view']);

    $this->actingAs($viewer)->get('/activity-log?'.http_build_query(['subject_type' => Product::class]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('activity-log/index')
            ->where('activities.total', 2)
            ->where('activities.data.0.event', 'updated')
            ->where('activities.data.0.user', 'Rahim')
            ->where('activities.data.0.record', 'Split AC')
            ->where('activities.data.0.record_type', 'Product')
            ->where('activities.data.0.changes.0.field', 'Selling Price')
            ->where('activities.data.0.changes.0.old', '500')
            ->where('activities.data.0.changes.0.new', '550')
            ->where('activities.data.1.event', 'created'));
});

test('a deleted record is still named from what the log kept', function () {
    $this->actingAs(User::factory()->create());
    $category = ExpenseCategory::factory()->create(['name' => 'Rent']);
    $category->delete();

    $this->actingAs(userWithPermissions(['activity_log.view']))->get('/activity-log?event=deleted')
        ->assertInertia(fn ($page) => $page
            ->where('activities.total', 1)
            ->where('activities.data.0.record', 'Rent'));
});

test('it filters by user, record type, action and date', function () {
    $rahim = User::factory()->create(['name' => 'Rahim']);
    $karim = User::factory()->create(['name' => 'Karim']);

    $this->actingAs($rahim);
    Product::factory()->create(['name' => 'By Rahim']);
    $this->actingAs($karim);
    $expense = Expense::factory()->create();

    $viewer = userWithPermissions(['activity_log.view']);
    $this->actingAs($viewer);

    $this->get('/activity-log?'.http_build_query(['causer_id' => $rahim->id, 'subject_type' => Product::class]))
        ->assertInertia(fn ($page) => $page->where('activities.total', 1)->where('activities.data.0.record', 'By Rahim'));

    $this->get('/activity-log?'.http_build_query(['subject_type' => Expense::class]))
        ->assertInertia(fn ($page) => $page->where('activities.total', 1)->where('activities.data.0.record_type', 'Expense'));

    $this->get('/activity-log?'.http_build_query(['event' => 'updated', 'subject_type' => Expense::class]))
        ->assertInertia(fn ($page) => $page->where('activities.total', 0));

    Activity::query()->where('subject_type', Expense::class)->update(['created_at' => '2020-01-15 10:00:00']);
    $this->get('/activity-log?from=2020-01-01&to=2020-01-31')
        ->assertInertia(fn ($page) => $page->where('activities.total', 1));
    $this->get('/activity-log?'.http_build_query(['from' => '2021-01-01', 'subject_type' => Expense::class]))
        ->assertInertia(fn ($page) => $page->where('activities.total', 0));

    // the filter dropdowns offer the users that exist and record types that were logged
    $this->get('/activity-log')->assertInertia(fn ($page) => $page
        ->has('users', 3)
        ->where('recordTypes', fn ($types) => collect($types)->pluck('label')->contains('Product') && collect($types)->pluck('label')->contains('Expense')));

    expect($expense)->not->toBeNull();
});

test('signing in and out is recorded in the activity log with the address it came from', function () {
    $user = User::factory()->create(['email' => 'cashier@example.com', 'password' => 'secret-pass']);

    $this->post('/login', ['email' => 'cashier@example.com', 'password' => 'secret-pass'])->assertRedirect();
    $this->post('/logout');

    $entries = Activity::query()->where('causer_id', $user->id)->whereIn('event', ['login', 'logout'])->orderBy('id')->get();

    expect($entries->pluck('event')->all())->toBe(['login', 'logout'])
        ->and($entries->first()->subject_id)->toBe($user->id)
        ->and($entries->first()->properties->get('ip_address'))->not->toBeNull();
});

test('the log opens on the last few days and a cleared date reaches further back', function () {
    $user = User::factory()->create(['name' => 'Rahim']);
    $this->actingAs($user);

    $recent = Product::factory()->create(['name' => 'Recent item']);
    $old = Product::factory()->create(['name' => 'Old item']);
    Activity::query()->where('subject_id', $old->id)->update(['created_at' => now()->subDays(40)]);

    $viewer = userWithPermissions(['activity_log.view']);

    $product = '&subject_type='.urlencode(Product::class);

    // No dates: only the default window.
    $this->actingAs($viewer)->get('/activity-log?'.ltrim($product, '&'))
        ->assertInertia(fn ($page) => $page
            ->where('filters.from', now()->subDays(6)->toDateString())
            ->where('filters.to', now()->toDateString())
            ->where('defaultRange.from', now()->subDays(6)->toDateString())
            ->where('activities.total', 1)
            ->where('activities.data.0.record', 'Recent item'));

    // A date range that reaches back shows the old entry too.
    $this->actingAs($viewer)->get('/activity-log?'.http_build_query(['from' => now()->subDays(60)->toDateString(), 'to' => now()->toDateString()]).$product)
        ->assertInertia(fn ($page) => $page->where('activities.total', 2));

    // Clearing both dates on purpose means "everything".
    $this->actingAs($viewer)->get('/activity-log?from=&to='.$product)
        ->assertInertia(fn ($page) => $page->where('filters.from', null)->where('activities.total', 2));
});

test('the log can be filtered to logins', function () {
    $user = User::factory()->create(['email' => 'a@example.com', 'password' => 'secret-pass']);
    $this->post('/login', ['email' => 'a@example.com', 'password' => 'secret-pass']);

    $this->actingAs(userWithPermissions(['activity_log.view']))->get('/activity-log?event=login')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('activities.total', 1)->where('activities.data.0.event', 'login')->where('activities.data.0.user', $user->name));
});
