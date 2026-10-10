<?php

namespace App\Http\Controllers;

use App\Exports\ImportTemplateExport;
use App\Imports\ContactsImport;
use App\Imports\OpeningStockImport;
use App\Imports\ProductsImport;
use App\Imports\SalesImport;
use App\Support\ImportSchema;
use App\Support\PreviewRollback;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\HeadingRowImport;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Four independent bulk-upload flows sharing one page (পর্ব ২) — each
 * request is validated, handed to its Import class (which does its own
 * per-row/per-group validation and never lets one bad row abort the rest),
 * and the uploaded file is always deleted afterward whether the import
 * succeeded or not — nothing it carries needs to persist past this request.
 *
 * Before any row is touched the file itself is checked (readable, has the
 * required columns, has data rows) so a wrong file fails with one clear
 * message on the upload field instead of a wall of per-row skips.
 */
class ImportController extends Controller
{
    /** Where an uploaded file waits between its preview and its confirmation. */
    private const PREVIEW_DIR = 'imports-preview';

    /** @var array<string, array{class-string, string}> import type => [Import class, label] */
    private const IMPORTS = [
        'products' => [ProductsImport::class, 'Products'],
        'contacts' => [ContactsImport::class, 'Contacts'],
        'opening-stock' => [OpeningStockImport::class, 'Opening Stock'],
        'sales' => [SalesImport::class, 'Sales'],
    ];

    public function index(): Response
    {
        return Inertia::render('imports/index', [
            'result' => session('importResult'),
            'preview' => session('importPreview'),
            'schemas' => ImportSchema::all(),
        ]);
    }

    /**
     * An Excel file with the right header row and one example row, so people start from the correct shape. The
     * identifier columns (phone, SKU, barcode) are Text cells: a CSV cannot say so, and Excel then rewrote
     * +8801811111111 as 8.80181E+12 and lost the digits.
     */
    public function template(string $type): BinaryFileResponse
    {
        abort_unless(in_array($type, ImportSchema::TYPES, true), 404);

        return Excel::download(new ImportTemplateExport($type), "{$type}-import-template.xlsx");
    }

    /**
     * Step 1 of the two-step import: reads the file and shows, row by row, which value would go into which field
     * and which rows would be skipped and why — without keeping anything. The real import is run inside a
     * transaction that is always rolled back, so the preview is exactly what the real import would do, not a guess.
     * The file waits on disk (under a random token) until it is confirmed or cancelled.
     */
    public function preview(Request $request, string $type): RedirectResponse
    {
        abort_unless(array_key_exists($type, self::IMPORTS), 404);

        $validated = $this->validateUpload($request);
        $this->assertFileLooksRight($validated['file'], $type);
        $this->discardStalePreviews();

        $token = (string) Str::uuid();
        $path = $validated['file']->storeAs(self::PREVIEW_DIR, $token.'.'.(strtolower($validated['file']->getClientOriginalExtension()) ?: 'csv'), 'local');
        $import = app(self::IMPORTS[$type][0]);

        try {
            DB::transaction(function () use ($import, $path) {
                Excel::import($import, $path, 'local');

                throw new PreviewRollback;
            });
        } catch (PreviewRollback) {
            // Expected: nothing is kept.
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);

            throw $e;
        } finally {
            @unlink($validated['file']->getRealPath());
        }

        if ($import->result->created === 0 && $import->result->skipped === 0) {
            Storage::disk('local')->delete($path);

            throw ValidationException::withMessages(['file' => 'The file has no data rows. Add at least one row under the header row.']);
        }

        return to_route('imports.index')->with('importPreview', [
            'type' => $type,
            'label' => self::IMPORTS[$type][1],
            'token' => $token,
            'filename' => $validated['file']->getClientOriginalName(),
            ...$import->result->toArray(),
        ]);
    }

    /**
     * Step 2: imports the file that was previewed, for real.
     */
    public function confirm(Request $request, string $type): RedirectResponse
    {
        abort_unless(array_key_exists($type, self::IMPORTS), 404);

        $token = $request->validate(['token' => ['required', 'uuid']])['token'];
        $path = $this->previewPath($token);

        if ($path === null) {
            throw ValidationException::withMessages(['file' => 'This preview has expired. Choose the file again.']);
        }

        $import = app(self::IMPORTS[$type][0]);

        try {
            Excel::import($import, $path, 'local');
        } finally {
            Storage::disk('local')->delete($path);
        }

        return to_route('imports.index')->with('importResult', [
            'type' => $type,
            'label' => self::IMPORTS[$type][1],
            ...$import->result->toArray(),
        ]);
    }

    /**
     * "Cancel" on a preview: forget the waiting file.
     */
    public function discard(string $token): RedirectResponse
    {
        if (Str::isUuid($token) && ($path = $this->previewPath($token)) !== null) {
            Storage::disk('local')->delete($path);
        }

        return to_route('imports.index');
    }

    public function products(Request $request, ProductsImport $import): RedirectResponse
    {
        return $this->run($request, $import, 'products', 'Products');
    }

    public function contacts(Request $request, ContactsImport $import): RedirectResponse
    {
        return $this->run($request, $import, 'contacts', 'Contacts');
    }

    public function openingStock(Request $request, OpeningStockImport $import): RedirectResponse
    {
        return $this->run($request, $import, 'opening-stock', 'Opening Stock');
    }

    public function sales(Request $request, SalesImport $import): RedirectResponse
    {
        return $this->run($request, $import, 'sales', 'Sales');
    }

    /**
     * @param  ProductsImport|ContactsImport|OpeningStockImport|SalesImport  $import
     */
    private function run(Request $request, mixed $import, string $type, string $label): RedirectResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:10240'],
        ], [
            'file.required' => 'Choose a file to import.',
            'file.mimes' => 'The file must be an Excel (.xlsx, .xls) or CSV (.csv) file.',
            'file.max' => 'The file is too large. The limit is 10 MB.',
        ]);

        try {
            $this->assertFileLooksRight($validated['file'], $type);

            Excel::import($import, $validated['file']);
        } finally {
            @unlink($validated['file']->getRealPath());
        }

        if ($import->result->created === 0 && $import->result->skipped === 0) {
            throw ValidationException::withMessages(['file' => 'The file has no data rows. Add at least one row under the header row.']);
        }

        return to_route('imports.index')->with('importResult', [
            'type' => $type,
            'label' => $label,
            ...$import->result->toArray(),
        ]);
    }

    /**
     * Rejects a file that can't be read or whose header row lacks required columns.
     */
    private function assertFileLooksRight(mixed $file, string $type): void
    {
        try {
            $sheets = Excel::toArray(new HeadingRowImport, $file);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['file' => 'This file could not be read. Make sure it is a valid Excel or CSV file and is not password-protected.']);
        }

        $headings = array_values(array_filter(array_map(
            fn (mixed $heading) => $heading === null ? null : (string) $heading,
            $sheets[0][0] ?? [],
        ), fn (?string $heading) => $heading !== null && $heading !== ''));

        $missing = ImportSchema::missingColumns($type, $headings);

        if ($missing !== []) {
            throw ValidationException::withMessages([
                'file' => 'Missing required column'.(count($missing) > 1 ? 's' : '').': '.implode(', ', $missing).'. Download the template to see the expected header row.',
            ]);
        }
    }

    /**
     * @return array{file: UploadedFile}
     */
    private function validateUpload(Request $request): array
    {
        return $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:10240'],
        ], [
            'file.required' => 'Choose a file to import.',
            'file.mimes' => 'The file must be an Excel (.xlsx, .xls) or CSV (.csv) file.',
            'file.max' => 'The file is too large. The limit is 10 MB.',
        ]);
    }

    private function previewPath(string $token): ?string
    {
        return collect(Storage::disk('local')->files(self::PREVIEW_DIR))
            ->first(fn (string $file) => str_starts_with(basename($file), $token.'.'));
    }

    /**
     * Files nobody confirmed or cancelled (a closed tab) are not kept: anything older than a day goes.
     */
    private function discardStalePreviews(): void
    {
        $disk = Storage::disk('local');

        foreach ($disk->files(self::PREVIEW_DIR) as $file) {
            if ($disk->lastModified($file) < now()->subDay()->getTimestamp()) {
                $disk->delete($file);
            }
        }
    }
}
