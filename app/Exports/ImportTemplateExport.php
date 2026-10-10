<?php

namespace App\Exports;

use App\Imports\Concerns\BindsCellsAsStrings;
use App\Support\ImportSchema;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

/**
 * The downloadable import template as a real Excel file. A CSV cannot say "this column is text", so Excel turned a
 * phone such as +8801811111111 into 8.80181E+12 and saved that back; here every identifier column (phone, SKU,
 * barcode...) is formatted as Text, so what is typed stays exactly as typed.
 */
class ImportTemplateExport implements FromArray, ShouldAutoSize, WithColumnFormatting, WithCustomValueBinder, WithHeadings
{
    use BindsCellsAsStrings;

    public function __construct(private readonly string $type) {}

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return ImportSchema::headerRow($this->type);
    }

    /**
     * @return list<list<string>>
     */
    public function array(): array
    {
        return [array_map('strval', ImportSchema::exampleRow($this->type))];
    }

    /**
     * @return array<string, string>
     */
    public function columnFormats(): array
    {
        $formats = [];

        foreach ($this->headings() as $index => $heading) {
            if (in_array($heading, ImportSchema::IDENTIFIER_COLUMNS, true)) {
                $formats[Coordinate::stringFromColumnIndex($index + 1)] = NumberFormat::FORMAT_TEXT;
            }
        }

        return $formats;
    }
}
