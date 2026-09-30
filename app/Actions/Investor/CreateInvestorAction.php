<?php

namespace App\Actions\Investor;

use App\Enums\InvestorTransactionType;
use App\Models\Investor;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateInvestorAction
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, opening_amount?: float|string|null}  $data
     */
    public function execute(array $data): Investor
    {
        return DB::transaction(function () use ($data) {
            $investor = Investor::create([
                'name' => $data['name'],
                'created_by' => Auth::id(),
            ]);

            $openingAmount = round((float) ($data['opening_amount'] ?? 0), 2);

            if ($openingAmount !== 0.0) {
                $investor->update(['opening_amount' => $openingAmount]);
                $investor->addLedgerTransaction(InvestorTransactionType::OpeningBalance->value, $openingAmount);

                $this->postOpeningJournal($investor, $openingAmount);
            }

            return $investor->fresh();
        });
    }

    /**
     * Capital is a credit-normal equity account, so — like the Investor
     * adjustment and Other Liability opening — the amount goes in negative
     * (Dr Opening Balance Equity / Cr Capital), see JournalService docblock.
     */
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
