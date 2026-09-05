<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;
use ZipArchive;

/**
 * Extracts a backup zip's SQL dump(s) and applies them via the `mysql`
 * client. Queued (not run inline) because a large dump can take minutes —
 * requires a running queue worker (`php artisan queue:work`) to actually
 * process, same as any other queued job in this app.
 */
class RestoreDatabaseJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 1800;

    public function __construct(
        private readonly string $backupDisk,
        private readonly string $backupPath,
    ) {}

    public function handle(): void
    {
        $disk = Storage::disk($this->backupDisk);
        $tempDir = storage_path('app/restore-temp/'.Str::random(16));
        File::ensureDirectoryExists($tempDir);

        try {
            $zipPath = $tempDir.'/backup.zip';
            file_put_contents($zipPath, $disk->get($this->backupPath));

            $zip = new ZipArchive;

            if ($zip->open($zipPath) !== true) {
                throw new RuntimeException("Could not open backup zip: {$this->backupPath}");
            }

            $zip->extractTo($tempDir);
            $zip->close();

            $sqlFiles = File::glob("{$tempDir}/db-dumps/*.sql");

            if ($sqlFiles === []) {
                throw new RuntimeException("No .sql dump found inside backup: {$this->backupPath}");
            }

            foreach ($sqlFiles as $sqlFile) {
                $this->importSql($sqlFile);
            }

            Log::info("Database restored from backup: {$this->backupPath}");
        } finally {
            File::deleteDirectory($tempDir);
        }
    }

    private function importSql(string $sqlFile): void
    {
        $connectionName = config('database.default');
        $config = config("database.connections.{$connectionName}");
        $binaryPath = rtrim((string) ($config['dump']['dump_binary_path'] ?? ''), '/');
        $mysqlBinary = $binaryPath !== '' ? "{$binaryPath}/mysql" : 'mysql';

        $process = new Process([
            $mysqlBinary,
            '--host='.$config['host'],
            '--port='.$config['port'],
            '--user='.$config['username'],
            $config['database'],
        ], null, ['MYSQL_PWD' => $config['password']]);

        $process->setInput(fopen($sqlFile, 'r'));
        $process->setTimeout($this->timeout);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }
    }
}
