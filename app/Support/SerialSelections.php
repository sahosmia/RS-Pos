<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Sale's one-shot "create and confirm in the same request" flow submits
 * serial_numbers per line item before those items have real ids — this
 * zips the freshly-created line items (in insertion order) against the same
 * positional items array that built them, so each real item id can be
 * matched back to the serial numbers typed for it.
 */
class SerialSelections
{
    /**
     * @param  Collection<int, Model>  $lineItems
     * @param  array<int, array{serial_numbers?: array<int, string>}>  $items
     * @return array<int, array<int, string>>
     */
    public static function extract(Collection $lineItems, array $items): array
    {
        $selections = [];

        foreach (array_values($items) as $index => $item) {
            $lineItem = $lineItems[$index] ?? null;

            if ($lineItem === null) {
                continue;
            }

            $selections[$lineItem->getKey()] = array_values(array_filter(
                array_map(fn ($serial) => trim((string) $serial), $item['serial_numbers'] ?? []),
                fn (string $serial) => $serial !== '',
            ));
        }

        return $selections;
    }
}
