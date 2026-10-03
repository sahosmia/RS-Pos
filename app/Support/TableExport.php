<?php

namespace App\Support;

use App\Exports\GenericTableExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\LazyCollection;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Turns resolved rows into a CSV/Excel/PDF download — shared by every list
 * page's export endpoint (Datatable "Export" dialog) so adding export to
 * another resource is just building `$headings`/`$rows` and calling this,
 * not wiring a new file format per controller.
 *
 * Pass `$rows` as a lazy collection (see `chunked()`): CSV is written straight
 * to the response a chunk at a time, so its memory stays flat however many rows
 * there are. Excel and PDF must hold every row, so they stop at the limits in
 * config/exports.php instead of exhausting memory.
 */
class TableExport
{
    /**
     * Lazily walks a query in chunks (eager loads still apply). Ordering gets the primary key as a
     * tiebreaker so rows sharing a sort value are neither skipped nor repeated between chunks.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @return LazyCollection<int, TModel>
     */
    public static function chunked(Builder $query): LazyCollection
    {
        return $query
            ->orderBy($query->getModel()->getQualifiedKeyName())
            ->lazy((int) config('exports.chunk_size'));
    }

    /**
     * Largest row count the given format can export, or null when it has no limit.
     */
    public static function limit(string $format): ?int
    {
        return config("exports.limits.{$format}");
    }

    /**
     * @param  array<int, string>  $headings
     * @param  iterable<int, array<int, string|int|float|null>>  $rows
     */
    public static function respond(string $format, string $baseFilename, string $title, array $headings, iterable $rows): Response
    {
        if ($format === 'csv') {
            return self::streamCsv("{$baseFilename}.csv", $headings, $rows);
        }

        $rows = self::collect($rows, $format);

        return match ($format) {
            'xlsx' => Excel::download(new GenericTableExport($rows, $headings), "{$baseFilename}.xlsx"),
            'pdf' => Pdf::loadView('exports.table-pdf', [
                'title' => $title,
                'generatedAt' => now()->format('Y-m-d H:i'),
                'headings' => $headings,
                'rows' => $rows,
            ])->download("{$baseFilename}.pdf"),
        };
    }

    /**
     * @param  array<int, string>  $headings
     * @param  iterable<int, array<int, string|int|float|null>>  $rows
     */
    private static function streamCsv(string $filename, array $headings, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headings, $rows) {
            $out = fopen('php://output', 'w');

            fputcsv($out, $headings);

            foreach ($rows as $row) {
                fputcsv($out, $row);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Gathers the rows for a format that needs them all in memory, stopping one past the limit —
     * so even a huge table never gets loaded before being refused.
     *
     * @param  iterable<int, array<int, string|int|float|null>>  $rows
     * @return array<int, array<int, string|int|float|null>>
     */
    private static function collect(iterable $rows, string $format): array
    {
        $limit = self::limit($format);
        $collected = [];

        foreach ($rows as $row) {
            if ($limit !== null && count($collected) >= $limit) {
                abort(422, sprintf(
                    'Too many rows for %s export (limit %s). Narrow the filters, or export as CSV.',
                    strtoupper($format),
                    number_format($limit),
                ));
            }

            $collected[] = $row;
        }

        return $collected;
    }
}
