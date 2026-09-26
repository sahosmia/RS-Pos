<?php

use App\Enums\Appearance;
use App\Models\Settings;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->patch('/appearance', ['appearance' => 'dark'])->assertRedirect('/login');
});

test('a user can switch their appearance preference', function () {
    $user = User::factory()->create(['appearance' => 'system']);

    $this->actingAs($user)
        ->patch('/appearance', ['appearance' => 'dark'])
        ->assertRedirect();

    expect($user->fresh()->appearance)->toBe(Appearance::Dark);
});

test('an invalid appearance value is rejected', function () {
    $this->actingAs(User::factory()->create())
        ->patch('/appearance', ['appearance' => 'sepia'])
        ->assertSessionHasErrors('appearance');
});

test('a dark preference renders the dark class on the initial page load with no flash', function () {
    Settings::factory()->create();
    $user = User::factory()->create(['appearance' => 'dark']);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertSee('class="dark"', false);
});

test('a light preference renders no dark class and skips the system-preference script', function () {
    Settings::factory()->create();
    $user = User::factory()->create(['appearance' => 'light']);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertDontSee('class="dark"', false);
    $response->assertDontSee('prefers-color-scheme', false);
});

test('the system default still renders the client-side prefers-color-scheme check', function () {
    Settings::factory()->create();
    $user = User::factory()->create(['appearance' => 'system']);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertSee('prefers-color-scheme', false);
});
