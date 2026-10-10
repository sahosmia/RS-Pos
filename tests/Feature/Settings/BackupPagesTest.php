<?php

use App\Jobs\RestoreDatabaseJob;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
});

test('the backups page lists files on the backup disk', function () {
    $this->actingAs(userWithPermissions(['backup.manage']));

    Storage::disk('local')->put(config('backup.backup.name').'/2026-01-01-00-00-00.zip', 'fake-zip-contents');
    Storage::disk('local')->put(config('backup.backup.name').'/2026-01-02-00-00-00.zip', 'fake-zip-contents-2');

    $this->get('/backups')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('backups/index')->has('backups', 2));
});

test('deleting a backup removes it from the disk', function () {
    $this->actingAs(userWithPermissions(['backup.manage']));
    $path = config('backup.backup.name').'/2026-01-01-00-00-00.zip';
    Storage::disk('local')->put($path, 'fake-zip-contents');

    $this->delete('/backups/2026-01-01-00-00-00.zip')->assertRedirect();

    Storage::disk('local')->assertMissing($path);
});

test('deleting an unknown backup filename 404s', function () {
    $this->actingAs(userWithPermissions(['backup.manage']));

    $this->delete('/backups/does-not-exist.zip')->assertNotFound();
});

test('a path-traversal filename is rejected before any disk lookup', function () {
    $this->actingAs(userWithPermissions(['backup.manage']));

    $this->delete('/backups/'.urlencode('../../.env'))->assertNotFound();
});

test('restoring without typing RESTORE fails validation and dispatches nothing', function () {
    $this->actingAs(userWithPermissions(['backup.manage']));
    Bus::fake();
    $path = config('backup.backup.name').'/2026-01-01-00-00-00.zip';
    Storage::disk('local')->put($path, 'fake-zip-contents');

    $this->post('/backups/2026-01-01-00-00-00.zip/restore', ['confirmation' => 'restore'])
        ->assertSessionHasErrors('confirmation');

    Bus::assertNotDispatched(RestoreDatabaseJob::class);
});

test('there is no way to upload a backup file', function () {
    $this->actingAs(userWithPermissions(['backup.manage']));
    Bus::fake();

    $this->post('/backups/upload-restore', ['confirmation' => 'RESTORE'])->assertClientError();

    Bus::assertNotDispatched(RestoreDatabaseJob::class);
});

test('backups are kept for three days only', function () {
    expect(config('backup.cleanup.default_strategy'))
        ->keep_all_backups_for_days->toBe(3)
        ->keep_daily_backups_for_days->toBe(0)
        ->keep_weekly_backups_for_weeks->toBe(0)
        ->keep_monthly_backups_for_months->toBe(0)
        ->keep_yearly_backups_for_years->toBe(0);
});

test('backup now sends the browser straight to the download of the new backup', function () {
    $this->actingAs(userWithPermissions(['backup.manage']));
    Storage::disk('local')->put(config('backup.backup.name').'/2026-01-01-00-00-00.zip', 'fake-zip-contents');
    Artisan::shouldReceive('call')->once()->with('backup:run')->andReturn(0);

    $this->post('/backups', [], ['X-Inertia' => 'true'])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', route('backups.download', '2026-01-01-00-00-00.zip'));
});
