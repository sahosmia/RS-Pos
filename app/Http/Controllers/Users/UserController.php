<?php

namespace App\Http\Controllers\Users;

use App\Actions\User\DeleteUserAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * The one role every install starts with — matches `RoleController::
     * PROTECTED_ROLE`. Duplicated as a literal rather than shared, the same
     * way the seeder and tests already treat 'Admin' as a fixed name.
     */
    private const PROTECTED_ROLE = 'Admin';

    /**
     * Lives on the same "Roles & Permissions" page as role management —
     * `RoleController::index()` supplies the `users` list this acts on.
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $role = $data['role'];
        unset($data['role']);

        $user = User::create([
            ...$data,
            'password' => Hash::make($data['password']),
        ]);

        $user->assignRole($role);

        return back();
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();
        $role = $data['role'];
        unset($data['role']);

        if ($request->user()->id === $user->id && $user->hasRole(self::PROTECTED_ROLE) && $role !== self::PROTECTED_ROLE) {
            return back()->withErrors(['role' => 'You cannot remove your own Admin role.']);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        } else {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        $user->syncRoles([$role]);

        return back();
    }

    public function destroy(Request $request, User $user, DeleteUserAction $deleteUser): RedirectResponse
    {
        if ($request->user()->id === $user->id) {
            return back()->withErrors(['user' => 'You cannot delete your own account.']);
        }

        if ($blockedBy = $deleteUser->blockingReason($user)) {
            return back()->withErrors(['user' => $blockedBy]);
        }

        $deleteUser->execute($user);

        return back();
    }
}
