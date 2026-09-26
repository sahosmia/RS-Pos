<?php

use App\Models\User;

test('a guest hitting / is sent to the login page', function () {
    $this->get('/')->assertRedirect('/login');
});

test('an authenticated user hitting / is sent straight to the dashboard', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/')->assertRedirect('/dashboard');
});

test('an authenticated user hitting /login is bounced straight to the dashboard', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/login')->assertRedirect('/dashboard');
});
