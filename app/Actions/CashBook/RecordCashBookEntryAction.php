<?php

namespace App\Actions\CashBook;

use App\Enums\CashBookEntryType;
use App\Models\CashBook;
use App\Models\CashBookEntry;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RecordCashBookEntryAction
{
    /**
     * Add a petty cash entry and move the cash book's own balance.
     *
     * Never creates an account_transactions row — the cash book is a
     * standalone side-ledger, excluded from the formal accounts.
     *
     * @param  array{type: string, category_id?: int|null, amount: float|string, note?: string|null, entry_date: string}  $data
     */
    public function execute(array $data): CashBookEntry
    {
        return DB::transaction(function () use ($data) {
            $type = CashBookEntryType::from($data['type']);
            $amount = (float) $data['amount'];

            $entry = CashBookEntry::create([
                'type' => $type,
                'category_id' => $data['category_id'] ?? null,
                'amount' => $amount,
                'note' => $data['note'] ?? null,
                'entry_date' => $data['entry_date'],
                'created_by' => Auth::id(),
            ]);

            CashBook::current()->increment('current_balance', $type->signedAmount($amount));

            return $entry;
        });
    }
}
