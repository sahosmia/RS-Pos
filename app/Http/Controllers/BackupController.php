<?php

namespace App\Http\Controllers;

use App\Jobs\RestoreDatabaseJob;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Backup\BackupDestination\Backup;
use Spatie\Backup\BackupDestination\BackupDestination;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Self-service backup management — no real permission system exists yet in
 * this project (see AccountingPeriodController's same note), so this stays
 * behind the same `auth` middleware as every other route rather than a real
 * "backup.manage" gate; tighten this once roles land.
 */
class BackupController extends Controller
{
    private function diskName(): string
    {
        return config('backup.backup.destination.disks')[0];
    }

    private function backupName(): string
    {
        return config('backup.backup.name');
    }

    private function destination(): BackupDestination
    {
        return BackupDestination::create($this->diskName(), $this->backupName());
    }

    public function index(): Response
    {
        $backups = $this->destination()->backups()
            ->sortByDesc(fn (Backup $backup) => $backup->date())
            ->map(fn (Backup $backup) => [
                'filename' => basename($backup->path()),
                'date' => $backup->date()->toDateTimeString(),
                'size_in_bytes' => $backup->sizeInBytes(),
            ])
            ->values();

        return Inertia::render('backups/index', [
            'backups' => $backups,
        ]);
    }

    /**
     * "Backup Now" — runs synchronously (a DB-only dump is fast); the
     * scheduled daily backup (routes/console.php) is what production relies
     * on day to day.
     */
    public function store(): RedirectResponse
    {
        Artisan::call('backup:run');

        return back();
    }

    public function download(string $filename): StreamedResponse
    {
        $backup = $this->findBackup($filename);

        return Storage::disk($this->diskName())->download($backup->path());
    }

    public function destroy(string $filename): RedirectResponse
    {
        $this->findBackup($filename)->delete();

        return back();
    }

    /**
     * Heavily guarded: typed "RESTORE" confirmation, an automatic
     * safety-snapshot of the current database taken immediately before
     * restoring, then a queued RestoreDatabaseJob (needs a running
     * `queue:work` process to actually process, same as any other queued
     * job here).
     */
    public function restore(Request $request, string $filename): RedirectResponse
    {
        $request->validate(['confirmation' => ['required', 'in:RESTORE']]);

        $backup = $this->findBackup($filename);

        Artisan::call('backup:run', ['--only-db' => true]);

        RestoreDatabaseJob::dispatch($this->diskName(), $backup->path());

        return back()->with('status', 'Restore queued — a safety backup of the current database was taken first.');
    }

    /**
     * Upload a backup zip from elsewhere (e.g. migrating to new hosting)
     * and restore from it, via the same guarded flow as restore().
     */
    public function uploadRestore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'confirmation' => ['required', 'in:RESTORE'],
            'file' => ['required', 'file', 'mimes:zip'],
        ]);

        $filename = now()->format('Y-m-d-H-i-s').'-uploaded.zip';
        $path = $this->backupName().'/'.$filename;

        Storage::disk($this->diskName())->putFileAs($this->backupName(), $validated['file'], $filename);

        Artisan::call('backup:run', ['--only-db' => true]);

        RestoreDatabaseJob::dispatch($this->diskName(), $path);

        return back()->with('status', 'Restore queued — a safety backup of the current database was taken first.');
    }

    private function findBackup(string $filename): Backup
    {
        abort_unless((bool) preg_match('/^[\w.-]+\.zip$/', $filename), 404);

        $backup = $this->destination()->backups()
            ->first(fn (Backup $backup) => basename($backup->path()) === $filename);

        abort_if($backup === null, 404);

        return $backup;
    }
}
