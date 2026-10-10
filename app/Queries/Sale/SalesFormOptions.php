<?php

namespace App\Queries\Sale;

use App\Models\Account;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

class SalesFormOptions
{
    /**
     * @return Collection<int, Product>
     */
    public static function productsForSale(): Collection
    {
        return Product::query()->where('is_for_sale', true)->with('unit:id,name,short_name')->withCount('servicePlanTemplates')->orderBy('name')
            ->get(['id', 'unit_id', 'name', 'sku', 'barcode', 'selling_price', 'current_stock', 'track_serial_number', 'has_installation_service', 'warranty_period_months']);
    }

    /**
     * @return Collection<int, Account>
     */
    public static function activeAccounts(): Collection
    {
        return Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']);
    }
}
