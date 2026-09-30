<?php

namespace App\Actions\Investor;

use App\Enums\InvestorTransactionType;
use App\Models\Investor;
use App\Models\JournalEntry;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\DB;

class UpdateInvestorAction
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, opening_amount?: float|string|null}  $data
     */
    public function execute(Investor $investor, array $data): Investor
    {
        return DB::transaction(function () use ($investor, $data) {
            $canEditOpeningAmount = $investor->canEditOpeningAmount();
            $openingAmount = round((float) ($data['opening_amount'] ?? $investor->opening_amount), 2);

            $investor->update([
                'name' => $data['name'],
                'opening_amount' => $canEditOpeningAmount ? $openingAmount : $investor->opening_amount,
            ]);

            if ($canEditOpeningAmount) {
                $this->syncOpeningTransaction($investor, $openingAmount);
            }

            return $investor->fresh();
        });
    }

    private function syncOpeningTransaction(Investor $investor, float $openingAmount): void
    {
        $opening = $investor->openingTransaction();

        if ($opening === null) {
            if ($openingAmount !== 0.0) {
                $investor->addLedgerTransaction(InvestorTransactionType::OpeningBalance->value, $openingAmount);
                $this->postOpeningJournal($investor, $openingAmount);
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
            $investor->increment('total_invested', $delta);
            $this->syncOpeningJournal($investor, $openingAmount);
        }
    }

    private function syncOpeningJournal(Investor $investor, float $newAmount): void
    {
        $original = JournalEntry::query()
            ->where('reference_type', 'investor_opening_amount')
            ->where('reference_id', $investor->id)
            ->where('status', 'posted')
            ->first();

        if ($original !== null) {
            $this->journal->reverse($original, 'Opening balance corrected');
        }

        if ($newAmount !== 0.0) {
            $this->postOpeningJournal($investor, $newAmount);
        }
    }

    private function postOpeningJournal(Investor $investor, float $amount): void
    {
        $this->journal->postOpeningBalance(
            today(),
            $this->chartOfAccounts->code('3100'),
            $this->chartOfAccounts->code('3300'),
            -$amount,
            'investor_opening_amount',
            $investor->id,
            "Opening capital: {$investor->name}",
        );
    }
}
