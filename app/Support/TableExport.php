<?php

namespace App\Support;

use App\Exports\GenericTableExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response;

/**
 * Turns already-resolved rows into a CSV/Excel/PDF download — shared by
 * every list page's export endpoint (Datatable "Export" dialog) so adding
 * export to another resource is just building `$headings`/`$rows` and
 * calling this, not wiring a new file format per controller.
 */
class TableExport
{
    /**
     * @param  array<int, string>  $headings
     * @param  array<int, array<int, string|int|float|null>>  $rows
     */
    public static function respond(string $format, string $baseFilename, string $title, array $headings, array $rows): Response
    {
        return match ($format) {
            'csv' => Excel::download(new GenericTableExport($rows, $headings), "{$baseFilename}.csv", ExcelFormat::CSV),
            'xlsx' => Excel::download(new GenericTableExport($rows, $headings), "{$baseFilename}.xlsx"),
            'pdf' => Pdf::loadView('exports.table-pdf', [
                'title' => $title,
                'generatedAt' => now()->format('Y-m-d H:i'),
                'headings' => $headings,
                'rows' => $rows,
            ])->download("{$baseFilename}.pdf"),
        };
    }
}
