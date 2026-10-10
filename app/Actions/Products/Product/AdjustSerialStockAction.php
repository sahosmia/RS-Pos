<?php

namespace App\Actions\Products\Product;

use App\Enums\SerialNumberStatus;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\SerialNumber;
use App\Services\StockService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Stock adjustment for a product that tracks serial numbers. The count is never typed: units that are gone (lost,
 * stolen, damaged) are picked from the in-stock serial list and marked Written off; units that turned up are entered by
 * serial and become In stock. Stock moves by exactly those units, so the serial list and the stock stay equal, and each
 * direction is one stock movement with its journal entry.
 */
class AdjustSerialStockAction
{
    public function __construct(
        private StockService $stock,
        private PostStockAdjustmentJournal $postJournal,
    ) {}

    /**
     * @param  list<string>  $writeOff  serial numbers currently In stock that are gone
     * @param  list<string>  $found  new serial numbers that now exist in stock
     */
    public function execute(Product $product, array $writeOff, array $found, string $reason, ?float $unitCost = null): void
    {
        $writeOff = $this->clean($writeOff);
        $found = $this->clean($found);

        DB::transaction(function () use ($product, $writeOff, $found, $reason, $unitCost) {
            $product = Product::query()->lockForUpdate()->findOrFail($product->id);

            $units = $this->unitsToWriteOff($product, $writeOff);
            $this->assertNewSerialsAreFree($product, $found);

            $cost = $product->avg_cost > 0 ? (float) $product->avg_cost : $unitCost;

            if ($found !== [] && ($cost === null || $cost <= 0)) {
                throw ValidationException::withMessages(['unit_cost' => 'Enter the unit cost of the units you found — this product has no average cost yet.']);
            }

            if ($product->avg_cost <= 0 && $cost !== null && $cost > 0) {
                $product->forceFill(['avg_cost' => round($cost, 2)])->save();
            }

            if ($units->isNotEmpty()) {
                $movement = $this->stock->decrease($product, (float) $units->count(), StockMovementType::AdjustmentDecrease, note: $reason, unitCost: $cost);
                $units->each(fn (SerialNumber $unit) => $unit->update(['status' => SerialNumberStatus::WrittenOff]));
                $this->postJournal->execute($product, $movement, false, $reason);
            }

            if ($found !== []) {
                $movement = $this->stock->increase($product, (float) count($found), StockMovementType::AdjustmentIncrease, note: $reason, unitCost: $cost);

                foreach ($found as $serial) {
                    $product->serialNumbers()->create(['serial_number' => $serial, 'status' => SerialNumberStatus::InStock]);
                }

                $this->postJournal->execute($product, $movement, true, $reason);
            }
        });
    }

    /**
     * @param  list<string>  $serials
     * @return list<string>
     */
    private function clean(array $serials): array
    {
        return array_values(array_unique(array_filter(array_map(fn ($serial) => trim((string) $serial), $serials), fn (string $serial) => $serial !== '')));
    }

    /**
     * @param  list<string>  $serials
     * @return Collection<int, SerialNumber>
     */
    private function unitsToWriteOff(Product $product, array $serials): Collection
    {
        $units = $product->serialNumbers()->where('status', SerialNumberStatus::InStock)->whereIn('serial_number', $serials)->lockForUpdate()->get();

        $missing = array_values(array_diff($serials, $units->pluck('serial_number')->all()));

        if ($missing !== []) {
            throw ValidationException::withMessages(['remove_serials' => 'Not in stock for this product: '.implode(', ', $missing).'.']);
        }

        return $units;
    }

    /**
     * @param  list<string>  $serials
     */
    private function assertNewSerialsAreFree(Product $product, array $serials): void
    {
        $taken = $product->serialNumbers()->whereIn('serial_number', $serials)->pluck('serial_number')->all();

        if ($taken !== []) {
            throw ValidationException::withMessages(['add_serials' => 'Already recorded for this product: '.implode(', ', $taken).'.']);
        }
    }
}
