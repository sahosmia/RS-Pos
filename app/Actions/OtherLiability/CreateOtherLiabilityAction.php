<?php

namespace App\Actions\OtherLiability;

use App\Enums\OtherLiabilityTransactionType;
use App\Models\OtherLiability;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateOtherLiabilityAction
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, opening_amount?: float|string|null}  $data
     */
    public function execute(array $data): OtherLiability
    {
        return DB::transaction(function () use ($data) {
            $liability = OtherLiability::create([
                'name' => $data['name'],
                'created_by' => Auth::id(),
            ]);

            $openingAmount = round((float) ($data['opening_amount'] ?? 0), 2);

            if ($openingAmount !== 0.0) {
                $liability->update(['opening_amount' => $openingAmount]);
                $liability->addLedgerTransaction(OtherLiabilityTransactionType::OpeningLiability->value, $openingAmount);

                // Negative — liability-side of postOpeningBalance (Dr equity/Cr subject), see JournalService docblock.
                $this->journal->postOpeningBalance(
                    today(),
                    $this->chartOfAccounts->code('2300'),
                    $this->chartOfAccounts->code('3300'),
                    -$openingAmount,
                    'other_liability_opening_amount',
                    $liability->id,
                    "Opening balance: {$liability->name}",
                );
            }

            return $liability->fresh();
        });
    }
}
