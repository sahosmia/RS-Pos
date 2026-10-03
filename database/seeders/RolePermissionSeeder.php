<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Default roles + `module.action` permissions (Phase 18). Every existing
 * user is put on the Admin role so a fresh `migrate --seed` (or re-running
 * this on an already-live shop) never locks the current owner out.
 */
class RolePermissionSeeder extends Seeder
{
    /**
     * `module => [actions]` — flattened into `module.action` permission
     * names below. `sale`/`purchase` use `view_own`/`view_all` instead of a
     * plain `view`, per the row-level scoping design (erp-design-decisions.md).
     */
    public const MODULE_ACTIONS = [
        'product' => ['view', 'create', 'edit', 'delete'],
        'contact' => ['view', 'create', 'edit', 'delete', 'payment'],
        'sale' => ['view_own', 'view_all', 'create', 'edit', 'delete'],
        'purchase' => ['view_own', 'view_all', 'create', 'edit', 'delete'],
        'expense' => ['view', 'create', 'edit', 'delete'],
        'account' => ['view', 'create', 'edit', 'delete', 'transfer'],
        'accounting' => ['view', 'create', 'edit'],
        'asset' => ['view', 'create', 'edit', 'delete'],
        'finance' => ['view', 'create', 'edit', 'delete'],
        'staff' => ['view', 'create', 'edit', 'delete'],
        'service' => ['view', 'create', 'edit', 'delete'],
        'report' => ['view'],
        'financial_position' => ['view'],
        'import' => ['view'],
        'backup' => ['manage'],
        'activity_log' => ['view'],
        'settings' => ['manage'],
        'role' => ['manage'],
    ];

    public function run(): void
    {
        DB::transaction(function () {
            $permissionNames = $this->createPermissions();

            $admin = Role::query()->firstOrCreate(['name' => 'Admin']);
            $admin->syncPermissions($permissionNames);

            $manager = Role::query()->firstOrCreate(['name' => 'Manager']);
            $manager->syncPermissions($this->matching($permissionNames, [
                'product.*', 'contact.*', 'sale.*', 'purchase.*', 'expense.*', 'service.*',
                'staff.view', 'report.view',
            ]));

            $cashier = Role::query()->firstOrCreate(['name' => 'Cashier']);
            $cashier->syncPermissions(['sale.create', 'sale.view_own', 'product.view']);

            $staff = Role::query()->firstOrCreate(['name' => 'Staff']);
            $staff->syncPermissions([
                'product.view', 'contact.view', 'contact.create',
                'sale.view_own', 'sale.create', 'purchase.view_own', 'purchase.create',
                'expense.view', 'expense.create', 'service.view', 'service.create',
            ]);

            // Never lock the current owner(s) out when this runs against an
            // already-live shop — every existing user keeps full access.
            User::query()->each(fn (User $user) => $user->assignRole($admin));
        });
    }

    /**
     * @return list<string>
     */
    private function createPermissions(): array
    {
        $names = [];

        foreach (self::MODULE_ACTIONS as $module => $actions) {
            foreach ($actions as $action) {
                $name = "{$module}.{$action}";
                Permission::query()->firstOrCreate(['name' => $name]);
                $names[] = $name;
            }
        }

        return $names;
    }

    /**
     * Expand `module.*` wildcards against the real permission list, so the
     * role definitions above stay readable without spelling out every
     * `module.action` combination by hand.
     *
     * @param  list<string>  $allPermissions
     * @param  list<string>  $patterns
     * @return list<string>
     */
    private function matching(array $allPermissions, array $patterns): array
    {
        return collect($allPermissions)
            ->filter(fn (string $name) => collect($patterns)->contains(
                fn (string $pattern) => str($pattern)->endsWith('.*')
                    ? str($name)->startsWith(str($pattern)->beforeLast('*'))
                    : $name === $pattern,
            ))
            ->values()
            ->all();
    }
}
