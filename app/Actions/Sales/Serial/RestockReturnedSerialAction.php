<?php

namespace App\Actions\Sales\Serial;

use App\Enums\SerialNumberStatus;
use App\Models\SaleItem;
use App\Models\SerialNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A customer returned the unit and it is physically back on the shelf: make it sellable again.
 * A Sale Return already added the quantity back to stock, so only the unit's own status changes — it goes from
 * Returned to In stock, which is the one status a new sale accepts.
 */
class RestockReturnedSerialAction
{
    public function execute(SaleItem $item, string $serial): void
    {
        DB::transaction(function () use ($item, $serial) {
            $unit = SerialNumber::query()
                ->where('sale_item_id', $item->id)
                ->where('serial_number', trim($serial))
                ->where('status', SerialNumberStatus::Returned)
                ->lockForUpdate()
                ->first();

            if ($unit === null) {
                throw ValidationException::withMessages(['serial' => ['Only a returned unit can be put back in stock.']]);
            }

            $unit->update(['status' => SerialNumberStatus::InStock, 'sale_item_id' => null]);
        });
    }
}
