<?php

namespace App\Imports;

use App\Actions\Products\Product\CreateProductAction;
use App\Imports\Concerns\BindsCellsAsStrings;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Support\ImportResult;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * Bulk product upload for initial data migration (পর্ব ২). Category/Brand/
 * Unit are looked up by name and auto-created if missing — unlike Products
 * themselves (matched strictly by SKU, never auto-created), these are
 * cheap, freely-creatable lookups already treated that way in the UI
 * (LookupManagerModal lets an operator add one inline from any form).
 * Every row still goes through CreateProductAction, so an imported product
 * gets the exact same opening-stock/avg_cost handling as one added by hand.
 */
class ProductsImport implements ToCollection, WithCustomValueBinder, WithHeadingRow
{
    use BindsCellsAsStrings;

    public ImportResult $result;

    public function __construct(private CreateProductAction $createProduct)
    {
        $this->result = new ImportResult;
    }

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $data = $row->toArray();

            $validator = Validator::make($data, [
                'name' => ['required', 'string', 'max:255'],
                'sku' => ['required', 'string', 'max:255'],
                'category' => ['required', 'string'],
                'unit' => ['required', 'string'],
                'selling_price' => ['required', 'numeric', 'min:0'],
            ]);

            if ($validator->fails()) {
                $this->result->addSkipped("Row {$rowNumber}: ".$validator->errors()->first());

                continue;
            }

            if (Product::query()->where('sku', $data['sku'])->exists()) {
                $this->result->addSkipped("Row {$rowNumber}: SKU \"{$data['sku']}\" already exists");

                continue;
            }

            $category = Category::query()->firstOrCreate(['name' => trim($data['category'])]);
            $unit = Unit::query()->firstOrCreate(['name' => trim($data['unit'])]);
            $brand = ! empty($data['brand']) ? Brand::query()->firstOrCreate(['name' => trim($data['brand'])]) : null;

            $this->createProduct->execute([
                'name' => $data['name'],
                'sku' => $data['sku'],
                'barcode' => $data['barcode'] ?? null,
                'category_id' => $category->id,
                'brand_id' => $brand?->id,
                'unit_id' => $unit->id,
                'selling_price' => $data['selling_price'],
                'minimum_stock_level' => $data['minimum_stock_level'] ?? 0,
                'opening_stock' => $data['opening_stock'] ?? 0,
                'opening_stock_cost' => $data['opening_stock_cost'] ?? 0,
                'warranty_period_months' => $data['warranty_period_months'] ?? null,
            ]);

            $this->result->addCreated();
        }
    }
}
