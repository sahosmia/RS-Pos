<?php

namespace App\Actions\Products\Product;

use App\Models\Product;
use App\Models\StockMovement;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;

/**
 * The General Ledger side of a stock adjustment: the units written off (or found) at the product's average cost move
 * Inventory against "Stock Adjustment Loss/Gain", so Inventory keeps matching the stock the shop holds. A movement with
 * no cost (a never-bought product with no cost given) has no value to post.
 */
class PostStockAdjustmentJournal
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    public function execute(Product $product, StockMovement $movement, bool $increase, ?string $note = null): void
    {
        $value = round((float) $movement->total_cost, 2);

        if ($value <= 0) {
            return;
        }

        $inventory = $this->chartOfAccounts->code('1200');
        $adjustment = $this->chartOfAccounts->code('5110');

        $lines = $increase
            ? [
                ['chart_of_account_id' => $inventory->id, 'debit' => $value, 'credit' => 0],
                ['chart_of_account_id' => $adjustment->id, 'debit' => 0, 'credit' => $value],
            ]
            : [
                ['chart_of_account_id' => $adjustment->id, 'debit' => $value, 'credit' => 0],
                ['chart_of_account_id' => $inventory->id, 'debit' => 0, 'credit' => $value],
            ];

        $this->journal->post(
            today(),
            'Stock adjustment — '.$product->name.($note ? ": {$note}" : ''),
            $lines,
            'stock_adjustment',
            $movement->id,
        );
    }
}
