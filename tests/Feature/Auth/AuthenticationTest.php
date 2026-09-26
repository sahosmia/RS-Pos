<?php

use App\Models\User;

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('users can authenticate using their username instead of email', function () {
    $user = User::factory()->create(['username' => 'jane_doe']);

    $this->post('/login', [
        'email' => 'jane_doe',
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});

test('the dashboard flags exactly the one page render right after login as a fresh login', function () {
    $user = User::factory()->create();

    $this->post('/login', ['email' => $user->email, 'password' => 'password']);

    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('freshLogin', true));

    // A later, ordinary navigation in the same session is not a fresh login anymore.
    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('freshLogin', false));
});
