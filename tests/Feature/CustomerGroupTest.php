<?php

use App\Models\Contact;
use App\Models\CustomerGroup;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/customer-groups')->assertRedirect('/login');
});

test('customer groups page lists groups with their contact count', function () {
    $this->actingAs(User::factory()->create());
    $group = CustomerGroup::factory()->create(['name' => 'VIP']);
    Contact::factory()->create(['customer_group_id' => $group->id]);

    $this->get('/customer-groups')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('customer-groups/index')
            ->where('customerGroups.0.name', 'VIP')
            ->where('customerGroups.0.contacts_count', 1)
            ->where('customerGroups.0.can_delete', false));
});

test('a customer group can be updated', function () {
    $this->actingAs(User::factory()->create());
    $group = CustomerGroup::factory()->create(['name' => 'VIP']);

    $this->patch("/customer-groups/{$group->id}", ['name' => 'VIP Updated'])
        ->assertRedirect();

    expect($group->fresh()->name)->toBe('VIP Updated');
});

test('a group with contacts cannot be deleted', function () {
    $this->actingAs(User::factory()->create());
    $group = CustomerGroup::factory()->create();
    Contact::factory()->create(['customer_group_id' => $group->id]);

    $this->delete("/customer-groups/{$group->id}")->assertSessionHasErrors('customer_group');

    expect(CustomerGroup::query()->find($group->id))->not->toBeNull();
});
