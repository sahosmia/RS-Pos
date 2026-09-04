<?php

namespace App\Http\Controllers;

use App\Http\Requests\CustomerGroup\CustomerGroupRequest;
use App\Models\CustomerGroup;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CustomerGroupController extends Controller
{
    public function index(): Response
    {
        $groups = CustomerGroup::query()->withCount('contacts')->orderBy('name')->get();

        return Inertia::render('customer-groups/index', [
            'customerGroups' => $groups->map(fn (CustomerGroup $group) => [
                'id' => $group->id,
                'name' => $group->name,
                'contacts_count' => $group->contacts_count,
                'can_delete' => $group->contacts_count === 0,
            ]),
        ]);
    }

    public function store(CustomerGroupRequest $request): RedirectResponse
    {
        CustomerGroup::create($request->validated());

        return back();
    }

    public function update(CustomerGroupRequest $request, CustomerGroup $customerGroup): RedirectResponse
    {
        $customerGroup->update($request->validated());

        return back();
    }

    /**
     * Groups already assigned to a contact are kept.
     */
    public function destroy(CustomerGroup $customerGroup): RedirectResponse
    {
        if ($customerGroup->contacts()->exists()) {
            return back()->withErrors([
                'customer_group' => 'This group has contacts assigned to it and cannot be deleted.',
            ]);
        }

        $customerGroup->delete();

        return back();
    }
}
