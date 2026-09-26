<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('backup:run')->daily()->at('01:00')->onOneServer();
Schedule::command('backup:clean')->daily()->at('01:30')->onOneServer();
Schedule::command('backup:monitor')->daily()->at('02:00')->onOneServer();
Schedule::command('emi:mark-overdue')->daily()->at('00:30')->onOneServer();
Schedule::command('reconciliation:check')->daily()->at('03:00')->onOneServer();
Schedule::command('activitylog:prune-old')->monthlyOn(1, '04:00')->onOneServer();
Schedule::command('notifications:generate')->daily()->at('05:00')->onOneServer();
