<?php

namespace App\Actions\Products\Product;

use App\Models\Product;

/**
 * Replaces a product's service_plan_templates with the submitted ordered
 * list — shared by CreateProductAction and UpdateProductAction so both
 * sync the same way. Only ever touches the template; already-sold units
 * keep their own snapshotted SaleItemServicePeriod rows untouched (see
 * ConfirmSaleAction), so editing this never affects past sales.
 */
class ServicePlanSync
{
    /**
     * @param  array<int, array{period_months: int|string, free_quota: int|string}>  $periods
     */
    public static function sync(Product $product, array $periods): void
    {
        $product->servicePlanTemplates()->delete();

        foreach (array_values($periods) as $index => $period) {
            $product->servicePlanTemplates()->create([
                'period_number' => $index + 1,
                'period_months' => (int) $period['period_months'],
                'free_quota' => (int) ($period['free_quota'] ?? 0),
            ]);
        }
    }
}
