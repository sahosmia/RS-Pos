<?php

use App\Enums\ThemeColor;
use App\Models\Settings;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->patch('/theme-color', ['theme_color' => 'blue'])->assertRedirect('/login');
});

test('a user can set a personal theme color override', function () {
    $user = User::factory()->create(['theme_color' => null]);

    $this->actingAs($user)
        ->patch('/theme-color', ['theme_color' => 'blue'])
        ->assertRedirect();

    expect($user->fresh()->theme_color)->toBe(ThemeColor::Blue);
});

test('a user can clear their override to fall back to the shop default', function () {
    $user = User::factory()->create(['theme_color' => 'rose']);

    $this->actingAs($user)
        ->patch('/theme-color', ['theme_color' => null])
        ->assertRedirect();

    expect($user->fresh()->theme_color)->toBeNull();
});

test('an invalid theme color is rejected', function () {
    $this->actingAs(User::factory()->create())
        ->patch('/theme-color', ['theme_color' => 'not-a-color'])
        ->assertSessionHasErrors('theme_color');
});

test('shared props expose the shop default and the user\'s own override separately', function () {
    Settings::factory()->create(['theme_color' => 'green']);
    $user = User::factory()->create(['theme_color' => 'violet']);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->where('shop.theme_color', 'green')
            ->where('auth.user.theme_color', 'violet'));
});

test('the initial page render applies the user\'s override with no flash', function () {
    Settings::factory()->create(['theme_color' => 'green']);
    $user = User::factory()->create(['theme_color' => 'violet']);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertSee('data-theme-color="violet"', false);
});

test('the initial page render falls back to the shop default when the user has no override', function () {
    Settings::factory()->create(['theme_color' => 'green']);
    $user = User::factory()->create(['theme_color' => null]);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertSee('data-theme-color="green"', false);
});

test('neutral renders with no data-theme-color attribute at all', function () {
    Settings::factory()->create(['theme_color' => 'neutral']);
    $user = User::factory()->create(['theme_color' => null]);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertDontSee('data-theme-color', false);
});
