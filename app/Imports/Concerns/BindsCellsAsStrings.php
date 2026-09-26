<?php

namespace App\Imports\Concerns;

use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\StringValueBinder;

/**
 * Without this, PhpSpreadsheet auto-detects any all-digit or leading-"+"
 * cell (a phone number, a zero-padded SKU, an invoice number) as numeric
 * and silently mangles it — dropping the leading "+"/zeros, or worse,
 * round-tripping through float precision. Reading every cell as a raw
 * string instead is safe everywhere here: every numeric field this app's
 * Import classes need (price, quantity, opening stock...) is cast with
 * `(float)`/`(int)` in code anyway, and Laravel's `numeric` validation
 * rule accepts numeric strings just as well as real numbers.
 */
trait BindsCellsAsStrings
{
    public function bindValue(Cell $cell, $value): bool
    {
        return (new StringValueBinder)->bindValue($cell, $value);
    }
}
