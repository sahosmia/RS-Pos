<?php

namespace App\Actions\Products\Product;

use App\Models\Product;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;

/**
 * Shared by CreateProductAction/UpdateProductAction/OpeningStockImport —
 * opening stock previously only ever touched `stock_movements` (via
 * StockService), never the General Ledger, unlike every other opening
 * balance in the app (Account/Contact/Asset/OtherLiability all post Dr
 * subject/Cr 3300 Opening Balance Equity). Left uncorrected, Inventory
 * (1200)'s GL balance would only ever reflect Purchase/Sale movements,
 * permanently under-counting real stock value by every product's opening
 * quantity — exactly the kind of silent divergence the Reconciliation
 * Check (পর্ব ১৪) exists to catch, so this needed fixing alongside it,
 * not after.
 */
class PostOpeningStockJournal
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    public function execute(Product $product, float $quantity, float $unitCost): void
    {
        $value = round($quantity * $unitCost, 2);

        if ($value === 0.0) {
            return;
        }

        $this->journal->postOpeningBalance(
            today(),
            $this->chartOfAccounts->code('1200'),
            $this->chartOfAccounts->code('3300'),
            $value,
            'product_opening_stock',
            $product->id,
            "Opening stock: {$product->name}",
        );
    }
}
