<?php

namespace App\Actions\Account;

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Models\FundTransfer;
use App\Services\AccountService;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FundTransferAction
{
    public function __construct(private AccountService $accounts) {}

    /**
     * Move money between two of the shop's own accounts — one transfer_out
     * on the source, one transfer_in on the destination.
     */
    public function execute(
        Account $from,
        Account $to,
        float $amount,
        CarbonInterface $transferDate,
        ?string $note = null,
    ): FundTransfer {
        return DB::transaction(function () use ($from, $to, $amount, $transferDate, $note) {
            $transfer = FundTransfer::create([
                'from_account_id' => $from->id,
                'to_account_id' => $to->id,
                'amount' => $amount,
                'transfer_date' => $transferDate,
                'note' => $note,
                'created_by' => Auth::id(),
            ]);

            $this->accounts->record($from, AccountTransactionType::TransferOut, -$amount, $transferDate, 'fund_transfer', $transfer->id, $note);
            $this->accounts->record($to, AccountTransactionType::TransferIn, $amount, $transferDate, 'fund_transfer', $transfer->id, $note);

            return $transfer;
        });
    }
}
