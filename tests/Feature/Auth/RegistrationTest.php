<?php

use App\Models\User;

/**
 * There's deliberately no self-service sign-up in this app (see routes/auth.php) —
 * these assert the `register` route is fully gone, not just hidden, for both a
 * guest and an already-authenticated user.
 */
test('the registration page no longer exists', function () {
    $this->get('/register')->assertNotFound();
});

test('the registration endpoint no longer accepts submissions', function () {
    $this->post('/register', [
        'name' => 'Test User',
        'email' => 'new-signup@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    $this->assertGuest();
    expect(User::query()->where('email', 'new-signup@example.com')->exists())->toBeFalse();
});

test('an authenticated user hitting /register the same way still gets nothing', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/register')->assertNotFound();
    $this->post('/register', ['name' => 'x'])->assertNotFound();
});
