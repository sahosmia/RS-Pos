<?php

namespace App\Console\Commands;

use App\Models\Settings;
use Illuminate\Console\Command;
use Spatie\Activitylog\Models\Activity;

/**
 * Monthly sweep: activity_log rows older than the shop's configured
 * retention window (settings.activity_log_retention_months) are deleted —
 * keeps the audit trail bounded without touching financial records, which
 * are never subject to this.
 */
class PruneOldActivityLogs extends Command
{
    protected $signature = 'activitylog:prune-old';

    protected $description = "Delete activity log entries older than the shop's configured retention window";

    public function handle(): void
    {
        $months = Settings::query()->value('activity_log_retention_months') ?? 18;

        $count = Activity::query()
            ->where('created_at', '<', now()->subMonths($months))
            ->delete();

        $this->info("Deleted {$count} activity log entries older than {$months} months.");
    }
}
