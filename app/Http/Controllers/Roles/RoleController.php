<?php

namespace App\Http\Controllers\Roles;

use App\Actions\User\DeleteUserAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Roles\Role\RoleRequest;
use App\Http\Requests\Roles\UserRole\UpdateUserRoleRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * The one role every install starts with — protected from rename/delete
     * so nobody can lock every admin out of their own permission system.
     */
    private const PROTECTED_ROLE = 'Admin';

    public function index(Request $request, DeleteUserAction $deleteUser): Response
    {
        $roles = Role::query()
            ->withCount('users')
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'users_count' => $role->users_count,
                'permissions' => $role->permissions->pluck('name'),
                'protected' => $role->name === self::PROTECTED_ROLE,
            ]);

        $permissionsByModule = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->groupBy(fn (Permission $permission) => Str::before($permission->name, '.'))
            ->map(fn ($permissions) => $permissions->map(fn (Permission $permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                'action' => Str::after($permission->name, '.'),
            ])->values());

        $users = User::query()
            ->with('roles:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'username', 'is_active'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'username' => $user->username,
                'is_active' => $user->is_active,
                'roles' => $user->roles->pluck('name'),
                'can_delete' => $request->user()->id !== $user->id && $deleteUser->blockingReason($user) === null,
            ]);

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'permissionsByModule' => $permissionsByModule,
            'users' => $users,
        ]);
    }

    public function store(RoleRequest $request): RedirectResponse
    {
        $role = Role::create(['name' => $request->validated('name')]);
        $role->syncPermissions($request->validated('permissions', []));

        return back();
    }

    public function update(RoleRequest $request, Role $role): RedirectResponse
    {
        if ($role->name === self::PROTECTED_ROLE && $request->validated('name') !== self::PROTECTED_ROLE) {
            return back()->withErrors(['name' => 'The Admin role cannot be renamed.']);
        }

        $role->update(['name' => $request->validated('name')]);
        $role->syncPermissions($request->validated('permissions', []));

        return back();
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->name === self::PROTECTED_ROLE) {
            return back()->withErrors(['role' => 'The Admin role cannot be deleted.']);
        }

        if ($role->users()->exists()) {
            return back()->withErrors(['role' => 'This role is assigned to one or more users and cannot be deleted.']);
        }

        $role->delete();

        return back();
    }

    /**
     * Assign/remove roles for one user — the Users tab of this same page.
     * Blocks a user from removing their own Admin role so nobody can lock
     * themselves out of role management.
     */
    public function updateUserRoles(UpdateUserRoleRequest $request, User $user): RedirectResponse
    {
        $roles = $request->validated('roles', []);

        if ($request->user()->id === $user->id && $user->hasRole(self::PROTECTED_ROLE) && ! in_array(self::PROTECTED_ROLE, $roles, true)) {
            return back()->withErrors(['roles' => 'You cannot remove your own Admin role.']);
        }

        $user->syncRoles($roles);

        return back();
    }
}
