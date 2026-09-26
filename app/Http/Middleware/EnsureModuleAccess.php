<?php

namespace App\Http\Middleware;

use Closure;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Backend enforcement for the `module.action` permissions the sidebar hides
 * menus by (corrections.md #9) — so typing a URL directly can't bypass what
 * the UI conceals. Usage: `module:sale` derives the action from the HTTP
 * method (GET → view, POST → create, PUT/PATCH → edit, DELETE → delete),
 * `module:contact,payment` forces a specific action for one-off routes.
 *
 * A method-derived action the module doesn't define falls back to the next
 * closest one it does (delete → edit → create → view, or `manage` for
 * modules like settings that only have that), so e.g. `report`/`import`
 * (view-only) need no special-casing.
 */
class EnsureModuleAccess
{
    private const FALLBACK = ['delete' => 'edit', 'edit' => 'create', 'create' => 'view'];

    public function handle(Request $request, Closure $next, string $module, ?string $action = null): Response
    {
        $user = $request->user();
        $defined = RolePermissionSeeder::MODULE_ACTIONS[$module] ?? [];

        $action ??= match ($request->method()) {
            'POST' => 'create',
            'PUT', 'PATCH' => 'edit',
            'DELETE' => 'delete',
            default => 'view',
        };

        while (! in_array($action, $defined, true) && isset(self::FALLBACK[$action])) {
            $action = self::FALLBACK[$action];
        }

        if (! in_array($action, $defined, true)) {
            $action = in_array('manage', $defined, true) ? 'manage' : 'view';
        }

        // Sales/purchases are row-scoped: `view_own` or `view_all` both open the list.
        $required = in_array('view_own', $defined, true) && $action === 'view'
            ? ["{$module}.view_own", "{$module}.view_all"]
            : ["{$module}.{$action}"];

        abort_unless($user && collect($required)->contains(fn (string $permission) => $user->can($permission)), 403);

        return $next($request);
    }
}
