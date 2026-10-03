<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * "Who added / last changed this?" for any table with `created_by` and `updated_by` columns: the
 * logged-in user is stamped on the row automatically (so no action can forget it), and `creator`
 * gives the name. An explicit value (seeders, imports on someone's behalf) is never overwritten.
 */
trait HasCreator
{
    public static function bootHasCreator(): void
    {
        static::creating(function ($model): void {
            if ($model->getAttribute('created_by') === null && Auth::check()) {
                $model->setAttribute('created_by', Auth::id());
            }
        });

        // Whoever last changed the row. Only stamped when something actually changed, and never
        // over an explicit value.
        static::updating(function ($model): void {
            if (Auth::check() && $model->isDirty() && ! $model->isDirty('updated_by')) {
                $model->setAttribute('updated_by', Auth::id());
            }
        });
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
