<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * One CSV/Excel export shared by every list page — takes already-resolved
 * rows (plain scalars, one array per row) and a heading row, so no
 * per-resource Export class is needed as new tables adopt export.
 */
class GenericTableExport implements FromArray, WithHeadings
{
    /**
     * @param  array<int, array<int, string|int|float|null>>  $rows
     * @param  array<int, string>  $headings
     */
    public function __construct(private readonly array $rows, private readonly array $headings) {}

    public function array(): array
    {
        return $this->rows;
    }

    public function headings(): array
    {
        return $this->headings;
    }
}
