<?php

namespace App\Queries\ActivityLog;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Models\Activity;

class ActivityLogQuery
{
    /**
     * Newest first. Every filter maps to a column the activity_log table indexes (created_at,
     * causer, subject), so the page stays quick however many years of history it holds.
     *
     * @param  array{from?: ?string, to?: ?string, causer_id?: ?int, subject_type?: ?string, event?: ?string}  $filters
     * @return Builder<Activity>
     */
    public static function filtered(array $filters): Builder
    {
        return Activity::query()
            ->with(['causer:id,name', 'subject'])
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->where('created_at', '>=', $from.' 00:00:00'))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->where('created_at', '<=', $to.' 23:59:59'))
            ->when($filters['causer_id'] ?? null, fn (Builder $q, int $id) => $q->where('causer_type', (new User)->getMorphClass())->where('causer_id', $id))
            ->when($filters['subject_type'] ?? null, fn (Builder $q, string $type) => $q->where('subject_type', $type))
            ->when($filters['event'] ?? null, fn (Builder $q, string $event) => $q->where('event', $event))
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }
}
