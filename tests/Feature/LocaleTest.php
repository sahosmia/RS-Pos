<?php

use App\Enums\Locale;
use App\Models\Settings;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->patch('/locale', ['locale' => 'en'])->assertRedirect('/login');
});

test('a user can switch their locale', function () {
    $user = User::factory()->create(['locale' => 'bn']);

    $this->actingAs($user)
        ->patch('/locale', ['locale' => 'en'])
        ->assertRedirect();

    expect($user->fresh()->locale)->toBe(Locale::En);
});

test('an invalid locale is rejected', function () {
    $this->actingAs(User::factory()->create())
        ->patch('/locale', ['locale' => 'fr'])
        ->assertSessionHasErrors('locale');
});

test('dashboard quick action labels follow the locale', function () {
    Settings::factory()->create();
    $user = User::factory()->create(['locale' => 'en']);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('quickActions.0.label', 'New Sale'));

    $user->update(['locale' => 'bn']);

    $this->actingAs($user->fresh())
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->where('quickActions.0.label', 'নতুন বিক্রি'));
});
