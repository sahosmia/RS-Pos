<?php

use App\Models\Contact;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

test('guests are redirected to the login page', function () {
    $this->get('/roles')->assertRedirect('/login');
});

test('a user without role.manage is forbidden', function () {
    $this->actingAs(userWithPermissions([]))->get('/roles')->assertForbidden();
});

test('the roles page lists roles, permissions grouped by module, and users', function () {
    $this->actingAs(userWithPermissions(['role.manage']));
    Permission::findOrCreate('product.view');
    Permission::findOrCreate('product.create');
    $role = Role::create(['name' => 'Cashier']);
    $role->givePermissionTo('product.view');

    $this->get('/roles')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('roles/index')
            ->where('permissionsByModule.product.0.name', 'product.create')
            ->where('permissionsByModule.product.1.name', 'product.delete'));
});

test('creating a role assigns the given permissions', function () {
    $this->actingAs(userWithPermissions(['role.manage']));
    Permission::findOrCreate('product.view');
    Permission::findOrCreate('product.create');

    $this->post('/roles', [
        'name' => 'Inventory Staff',
        'permissions' => ['product.view', 'product.create'],
    ])->assertRedirect();

    $role = Role::where('name', 'Inventory Staff')->first();
    expect($role)->not->toBeNull()
        ->and($role->permissions->pluck('name')->sort()->values()->all())->toBe(['product.create', 'product.view']);
});

test('the Admin role cannot be renamed or deleted', function () {
    $this->actingAs(userWithPermissions(['role.manage']));
    $admin = Role::create(['name' => 'Admin']);

    $this->patch("/roles/{$admin->id}", ['name' => 'Not Admin', 'permissions' => []])
        ->assertSessionHasErrors('name');

    $this->delete("/roles/{$admin->id}")->assertSessionHasErrors('role');
    expect(Role::find($admin->id))->not->toBeNull();
});

test('a role assigned to users cannot be deleted', function () {
    $this->actingAs(userWithPermissions(['role.manage']));
    $role = Role::create(['name' => 'Cashier']);
    User::factory()->create()->assignRole($role);

    $this->delete("/roles/{$role->id}")->assertSessionHasErrors('role');
    expect(Role::find($role->id))->not->toBeNull();
});

test('assigning roles to a user updates their role list', function () {
    $this->actingAs(userWithPermissions(['role.manage']));
    $role = Role::create(['name' => 'Cashier']);
    $target = User::factory()->create();

    $this->patch("/users/{$target->id}/roles", ['roles' => ['Cashier']])->assertRedirect();

    expect($target->fresh()->roles->pluck('name')->all())->toBe(['Cashier']);
});

test('a user cannot remove their own Admin role', function () {
    $admin = userWithPermissions(['role.manage']);
    $admin->assignRole(Role::create(['name' => 'Admin']));

    $this->actingAs($admin)
        ->patch("/users/{$admin->id}/roles", ['roles' => []])
        ->assertSessionHasErrors('roles');

    expect($admin->fresh()->hasRole('Admin'))->toBeTrue();
});

test('creating a user from the roles page works, hashes the password, and assigns the given role', function () {
    $this->actingAs(userWithPermissions(['role.manage']));
    Role::create(['name' => 'Cashier']);

    $this->post('/users', [
        'name' => 'New Cashier',
        'email' => 'cashier@example.com',
        'username' => 'new_cashier',
        'password' => 'password123',
        'role' => 'Cashier',
        'is_active' => true,
    ])->assertRedirect();

    $user = User::where('email', 'cashier@example.com')->firstOrFail();
    expect($user->name)->toBe('New Cashier')
        ->and($user->username)->toBe('new_cashier')
        ->and($user->is_active)->toBeTrue()
        ->and($user->hasRole('Cashier'))->toBeTrue()
        ->and(Hash::check('password123', $user->password))->toBeTrue();
});

test('creating a user requires a role and a username', function () {
    $this->actingAs(userWithPermissions(['role.manage']));

    $this->post('/users', [
        'name' => 'New Cashier',
        'email' => 'cashier@example.com',
        'password' => 'password123',
    ])->assertSessionHasErrors(['username', 'role']);
});

test('updating a user with a blank password leaves the existing password unchanged, and its role can be switched', function () {
    $this->actingAs(userWithPermissions(['role.manage']));
    Role::create(['name' => 'Cashier']);
    Role::create(['name' => 'Manager']);
    $target = User::factory()->create();
    $target->assignRole('Cashier');
    $originalHash = $target->password;

    $this->patch("/users/{$target->id}", [
        'name' => 'Renamed',
        'email' => $target->email,
        'username' => $target->username,
        'password' => '',
        'role' => 'Manager',
        'is_active' => false,
    ])->assertRedirect();

    expect($target->fresh()->name)->toBe('Renamed')
        ->and($target->fresh()->is_active)->toBeFalse()
        ->and($target->fresh()->password)->toBe($originalHash)
        ->and($target->fresh()->roles->pluck('name')->all())->toBe(['Manager']);
});

test('a user cannot demote their own Admin role via the edit-user form', function () {
    $admin = userWithPermissions(['role.manage']);
    $admin->assignRole(Role::create(['name' => 'Admin']));
    Role::create(['name' => 'Cashier']);

    $this->actingAs($admin)->patch("/users/{$admin->id}", [
        'name' => $admin->name,
        'email' => $admin->email,
        'username' => $admin->username,
        'password' => '',
        'role' => 'Cashier',
        'is_active' => true,
    ])->assertSessionHasErrors('role');

    expect($admin->fresh()->hasRole('Admin'))->toBeTrue();
});

test('a user with recorded activity cannot be deleted', function () {
    $this->actingAs(userWithPermissions(['role.manage']));
    $target = User::factory()->create();
    Contact::factory()->create(['created_by' => $target->id]);

    $this->delete("/users/{$target->id}")->assertSessionHasErrors('user');
    expect(User::find($target->id))->not->toBeNull();
});

test('a user with no recorded activity can be deleted', function () {
    $this->actingAs(userWithPermissions(['role.manage']));
    $target = User::factory()->create();

    $this->delete("/users/{$target->id}")->assertRedirect();
    expect(User::find($target->id))->toBeNull();
});

test('a user cannot delete their own account', function () {
    $admin = userWithPermissions(['role.manage']);

    $this->actingAs($admin)->delete("/users/{$admin->id}")->assertSessionHasErrors('user');
    expect(User::find($admin->id))->not->toBeNull();
});

test('an inactive user is logged out immediately and cannot log in', function () {
    $user = User::factory()->inactive()->create();

    $this->post('/login', ['email' => $user->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');

    $this->assertGuest();
});
