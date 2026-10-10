<?php

namespace App\Imports;

use App\Actions\Products\Product\PostOpeningStockJournal;
use App\Enums\StockMovementType;
use App\Imports\Concerns\BindsCellsAsStrings;
use App\Models\Product;
use App\Services\StockService;
use App\Support\ImportCell;
use App\Support\ImportResult;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * Separate from Product import (পর্ব ২) — batch-sets opening stock/cost on
 * products that already exist (matched by SKU) but were created without
 * it. Reuses `Product::canSetOpeningStock()`, the same one-shot guard the
 * Product edit form already enforces: a product with any stock movement
 * (the opening entry itself included) can no longer take a fresh one here
 * either — must go through a Stock Adjustment instead.
 */
class OpeningStockImport implements ToCollection, WithCustomValueBinder, WithHeadingRow
{
    use BindsCellsAsStrings;

    /** The fields shown next to each row in the preview and the result. */
    private const SHOWN = ['sku', 'quantity', 'unit_cost'];

    public ImportResult $result;

    public function __construct(
        private StockService $stock,
        private PostOpeningStockJournal $postOpeningStockJournal,
    ) {
        $this->result = new ImportResult;
    }

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $data = $row->toArray();
            $this->result->row($rowNumber, Arr::only($data, self::SHOWN));

            try {
                $data = ImportCell::normalise($data, ['sku'], []);
                $this->result->row($rowNumber, Arr::only($data, self::SHOWN));
            } catch (InvalidArgumentException $e) {
                $this->result->addSkipped("Row {$rowNumber}: ".$e->getMessage());

                continue;
            }

            $validator = Validator::make($data, [
                'sku' => ['required', 'string'],
                'quantity' => ['required', 'numeric'],
                'unit_cost' => ['required', 'numeric', 'min:0'],
            ]);

            if ($validator->fails()) {
                $this->result->addSkipped("Row {$rowNumber}: ".$validator->errors()->first());

                continue;
            }

            $product = Product::query()->where('sku', $data['sku'])->first();

            if ($product === null) {
                $this->result->addSkipped("Row {$rowNumber}: SKU \"{$data['sku']}\" not found");

                continue;
            }

            if (! $product->canSetOpeningStock()) {
                $this->result->addSkipped("Row {$rowNumber}: \"{$data['sku']}\" already has stock movements — use a Stock Adjustment instead");

                continue;
            }

            $quantity = (float) $data['quantity'];
            $unitCost = (float) $data['unit_cost'];

            try {
                DB::transaction(function () use ($product, $quantity, $unitCost) {
                    $this->stock->increase($product, $quantity, StockMovementType::OpeningStock);
                    $product->forceFill(['avg_cost' => $unitCost])->save();
                    $this->postOpeningStockJournal->execute($product, $quantity, $unitCost);
                });

                $this->result->addCreated();
            } catch (\Throwable $e) {
                $this->result->addSkipped("Row {$rowNumber}: ".$e->getMessage());
            }
        }
    }
}
