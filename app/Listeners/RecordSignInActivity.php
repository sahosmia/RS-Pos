<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Str;

/**
 * Puts "who signed in, and when" in the Activity Log next to everything else people do: one entry per login and one per
 * logout, with the address and browser it came from. (Laravel finds this listener on its own from the type-hinted events.)
 */
class RecordSignInActivity
{
    public function handleLogin(Login $event): void
    {
        $this->record($event->user, 'login');
    }

    public function handleLogout(Logout $event): void
    {
        // A session that had already expired has no user left to name.
        if ($event->user !== null) {
            $this->record($event->user, 'logout');
        }
    }

    private function record(Authenticatable $user, string $event): void
    {
        activity()
            ->causedBy($user)
            ->performedOn($user)
            ->event($event)
            ->withProperties([
                'ip_address' => request()->ip(),
                'attributes' => [
                    'ip_address' => request()->ip(),
                    'device' => Str::limit((string) request()->userAgent(), 80, '…'),
                ],
            ])
            ->log($event);
    }
}
