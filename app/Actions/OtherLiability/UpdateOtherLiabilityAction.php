<?php

namespace App\Actions\OtherLiability;

use App\Enums\OtherLiabilityTransactionType;
use App\Models\JournalEntry;
use App\Models\OtherLiability;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\DB;

class UpdateOtherLiabilityAction
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, opening_amount?: float|string|null}  $data
     */
    public function execute(OtherLiability $liability, array $data): OtherLiability
    {
        return DB::transaction(function () use ($liability, $data) {
            $canEditOpeningAmount = $liability->canEditOpeningAmount();
            $openingAmount = round((float) ($data['opening_amount'] ?? $liability->opening_amount), 2);

            $liability->update([
                'name' => $data['name'],
                'opening_amount' => $canEditOpeningAmount ? $openingAmount : $liability->opening_amount,
            ]);

            if ($canEditOpeningAmount) {
                $this->syncOpeningTransaction($liability, $openingAmount);
            }

            return $liability->fresh();
        });
    }

    private function syncOpeningTransaction(OtherLiability $liability, float $openingAmount): void
    {
        $opening = $liability->openingTransaction();

        if ($opening === null) {
            if ($openingAmount !== 0.0) {
                $liability->addLedgerTransaction(OtherLiabilityTransactionType::OpeningLiability->value, $openingAmount);
                $this->postOpeningJournal($liability, $openingAmount);
            }

            return;
        }

        $delta = $openingAmount - $opening->amount;

        if ($openingAmount === 0.0) {
            $opening->delete();
        } else {
            $opening->update(['amount' => $openingAmount]);
        }

        if ($delta !== 0.0) {
            $liability->increment('current_balance', $delta);
            $this->syncOpeningJournal($liability, $openingAmount);
        }
    }

    private function syncOpeningJournal(OtherLiability $liability, float $newAmount): void
    {
        $original = JournalEntry::query()
            ->where('reference_type', 'other_liability_opening_amount')
            ->where('reference_id', $liability->id)
            ->where('status', 'posted')
            ->first();

        if ($original !== null) {
            $this->journal->reverse($original, 'Opening balance corrected');
        }

        if ($newAmount !== 0.0) {
            $this->postOpeningJournal($liability, $newAmount);
        }
    }

    private function postOpeningJournal(OtherLiability $liability, float $amount): void
    {
        $this->journal->postOpeningBalance(
            today(),
            $this->chartOfAccounts->code('2300'),
            $this->chartOfAccounts->code('3300'),
            -$amount,
            'other_liability_opening_amount',
            $liability->id,
            "Opening balance: {$liability->name}",
        );
    }
}
