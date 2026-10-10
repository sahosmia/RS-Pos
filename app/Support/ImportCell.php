<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Cleans the cells that hold identifiers (phone numbers, SKUs, barcodes) before an import uses them.
 *
 * Excel turns a long all-digit cell into a number and, when the file is saved as CSV, writes it back as
 * scientific notation ("8.80181E+12") with most of the digits gone. Those digits cannot be recovered, so such a
 * value is refused with a message that says how to avoid it, instead of quietly saving a wrong phone number.
 */
final class ImportCell
{
    /** "8.80181E+12", "8,80181E+12" (comma decimal) or "8.80181e12". */
    private const SCIENTIFIC = '/^(\d+)(?:[.,](\d+))?[eE]\+?(\d+)$/';

    /**
     * A phone number: spaces, hyphens, dots and brackets removed, a leading "+" kept.
     */
    public static function phone(mixed $value, string $column = 'phone'): ?string
    {
        $text = self::identifier($value, $column);

        if ($text === null) {
            return null;
        }

        return preg_replace('/[\s().-]+/', '', $text);
    }

    /**
     * The cell as the plain text it was meant to be: trimmed, an integer-valued float written out in full, and a
     * scientific-notation string expanded when no digit was lost.
     *
     * @throws InvalidArgumentException when Excel has already thrown digits away
     */
    public static function identifier(mixed $value, string $column = 'value'): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_float($value) && $value == floor($value) && abs($value) < 1e15) {
            return sprintf('%.0f', $value);
        }

        $text = trim((string) $value);

        if ($text === '') {
            return null;
        }

        if (preg_match(self::SCIENTIFIC, $text, $parts) !== 1) {
            return $text;
        }

        [, $whole, $fraction, $exponent] = $parts + [2 => ''];
        $padding = (int) $exponent - strlen($fraction);

        // Fewer mantissa digits than the number needs: the rest were rounded away by Excel.
        if ($padding > 0) {
            throw new InvalidArgumentException(
                "{$column} \"{$text}\" was turned into scientific notation by Excel and its digits are lost. "
                .'Format that column as Text (or start from the downloaded .xlsx template) and enter the number again.',
            );
        }

        return $whole.$fraction;
    }

    /**
     * Normalises the named identifier columns of one import row; phone columns also get their punctuation removed.
     *
     * @param  array<string, mixed>  $row
     * @param  list<string>  $identifierColumns
     * @param  list<string>  $phoneColumns
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException
     */
    public static function normalise(array $row, array $identifierColumns, array $phoneColumns = []): array
    {
        foreach ($identifierColumns as $column) {
            if (array_key_exists($column, $row)) {
                $row[$column] = self::identifier($row[$column], $column);
            }
        }

        foreach ($phoneColumns as $column) {
            if (array_key_exists($column, $row)) {
                $row[$column] = self::phone($row[$column], $column);
            }
        }

        return $row;
    }
}
