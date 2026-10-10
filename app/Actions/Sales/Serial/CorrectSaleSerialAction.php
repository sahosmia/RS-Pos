<?php

namespace App\Actions\Sales\Serial;

use App\Enums\SaleSource;
use App\Enums\SaleStatus;
use App\Enums\SerialNumberStatus;
use App\Models\SaleItem;
use App\Models\SerialNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Fixes "I typed the wrong serial" on a Confirmed sale without undoing the sale: the unit that was recorded
 * by mistake goes back on the shelf (In stock) and the unit that was really handed over becomes Sold on the same
 * line. Stock quantity, money, ledger and journal are untouched — only which physical unit the invoice points to
 * changes, which is what the warranty and service history follow.
 */
class CorrectSaleSerialAction
{
    public function execute(SaleItem $item, string $from, string $to): void
    {
        $from = trim($from);
        $to = trim($to);

        DB::transaction(function () use ($item, $from, $to) {
            $item->loadMissing('sale', 'product');

            if ($item->sale->status !== SaleStatus::Confirmed || $item->sale->source === SaleSource::Imported) {
                $this->fail('Only a confirmed sale entered in the system has serial numbers to correct.');
            }

            $recorded = SerialNumber::query()
                ->where('sale_item_id', $item->id)
                ->where('serial_number', $from)
                ->where('status', SerialNumberStatus::Sold)
                ->lockForUpdate()
                ->first();

            if ($recorded === null) {
                $this->fail("Serial \"{$from}\" is not a sold unit on this line (a returned unit cannot be changed).");
            }

            if ($from === $to) {
                $this->fail('The new serial is the same as the current one.');
            }

            $replacement = SerialNumber::query()
                ->where('product_id', $item->product_id)
                ->where('serial_number', $to)
                ->lockForUpdate()
                ->first();

            if ($replacement === null || $replacement->status !== SerialNumberStatus::InStock) {
                $this->fail("Serial \"{$to}\" is not an in-stock unit of \"{$item->product->name}\".");
            }

            $recorded->update(['status' => SerialNumberStatus::InStock, 'sale_item_id' => null]);
            $replacement->update(['status' => SerialNumberStatus::Sold, 'sale_item_id' => $item->id]);
        });
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['serial' => [$message]]);
    }
}
