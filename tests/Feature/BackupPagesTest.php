<?php

use App\Jobs\RestoreDatabaseJob;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
});

test('the backups page lists files on the backup disk', function () {
    $this->actingAs(User::factory()->create());

    Storage::disk('local')->put(config('backup.backup.name').'/2026-01-01-00-00-00.zip', 'fake-zip-contents');
    Storage::disk('local')->put(config('backup.backup.name').'/2026-01-02-00-00-00.zip', 'fake-zip-contents-2');

    $this->get('/backups')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('backups/index')->has('backups', 2));
});

test('deleting a backup removes it from the disk', function () {
    $this->actingAs(User::factory()->create());
    $path = config('backup.backup.name').'/2026-01-01-00-00-00.zip';
    Storage::disk('local')->put($path, 'fake-zip-contents');

    $this->delete('/backups/2026-01-01-00-00-00.zip')->assertRedirect();

    Storage::disk('local')->assertMissing($path);
});

test('deleting an unknown backup filename 404s', function () {
    $this->actingAs(User::factory()->create());

    $this->delete('/backups/does-not-exist.zip')->assertNotFound();
});

test('a path-traversal filename is rejected before any disk lookup', function () {
    $this->actingAs(User::factory()->create());

    $this->delete('/backups/'.urlencode('../../.env'))->assertNotFound();
});

test('restoring without typing RESTORE fails validation and dispatches nothing', function () {
    $this->actingAs(User::factory()->create());
    Bus::fake();
    $path = config('backup.backup.name').'/2026-01-01-00-00-00.zip';
    Storage::disk('local')->put($path, 'fake-zip-contents');

    $this->post('/backups/2026-01-01-00-00-00.zip/restore', ['confirmation' => 'restore'])
        ->assertSessionHasErrors('confirmation');

    Bus::assertNotDispatched(RestoreDatabaseJob::class);
});

test('uploading a non-zip file for restore fails validation', function () {
    $this->actingAs(User::factory()->create());
    Bus::fake();

    $this->post('/backups/upload-restore', [
        'confirmation' => 'RESTORE',
        'file' => UploadedFile::fake()->create('not-a-backup.txt', 10),
    ])->assertSessionHasErrors('file');

    Bus::assertNotDispatched(RestoreDatabaseJob::class);
});
