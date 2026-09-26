<?php

namespace App\Models\Concerns;

use Spatie\Activitylog\Contracts\Activity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Shared Spatie Activitylog configuration for master/document models —
 * logs only fillable attributes that actually changed, and skips no-op
 * saves so `activity_logs` doesn't fill up with empty diffs.
 */
trait LogsActivityDefaults
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Stamp the requester's IP alongside the usual causer/subject/properties
     * — the design doc's audit schema calls for it, but the package doesn't
     * record it out of the box.
     */
    public function tapActivity(Activity $activity, string $eventName): void
    {
        $activity->properties = $activity->properties->put('ip_address', request()->ip());
    }
}
