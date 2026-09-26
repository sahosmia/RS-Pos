<?php

namespace App\Http\Controllers;

use App\Imports\ContactsImport;
use App\Imports\OpeningStockImport;
use App\Imports\ProductsImport;
use App\Imports\SalesImport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Four independent bulk-upload flows sharing one page (পর্ব ২) — each
 * request is validated, handed to its Import class (which does its own
 * per-row/per-group validation and never lets one bad row abort the rest),
 * and the uploaded file is always deleted afterward whether the import
 * succeeded or not — nothing it carries needs to persist past this request.
 */
class ImportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('imports/index', [
            'result' => session('importResult'),
        ]);
    }

    public function products(Request $request, ProductsImport $import): RedirectResponse
    {
        return $this->run($request, $import, 'Products');
    }

    public function contacts(Request $request, ContactsImport $import): RedirectResponse
    {
        return $this->run($request, $import, 'Contacts');
    }

    public function openingStock(Request $request, OpeningStockImport $import): RedirectResponse
    {
        return $this->run($request, $import, 'Opening Stock');
    }

    public function sales(Request $request, SalesImport $import): RedirectResponse
    {
        return $this->run($request, $import, 'Sales');
    }

    /**
     * @param  ProductsImport|ContactsImport|OpeningStockImport|SalesImport  $import
     */
    private function run(Request $request, mixed $import, string $label): RedirectResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv'],
        ]);

        try {
            Excel::import($import, $validated['file']);
        } finally {
            @unlink($validated['file']->getRealPath());
        }

        return to_route('imports.index')->with('importResult', [
            'label' => $label,
            ...$import->result->toArray(),
        ]);
    }
}
