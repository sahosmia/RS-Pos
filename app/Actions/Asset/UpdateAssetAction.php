<?php

namespace App\Actions\Asset;

use App\Enums\AssetTransactionType;
use App\Models\Asset;
use App\Models\JournalEntry;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\DB;

class UpdateAssetAction
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, category?: string|null, purchase_date?: string|null, opening_value?: float|string|null}  $data
     */
    public function execute(Asset $asset, array $data): Asset
    {
        return DB::transaction(function () use ($asset, $data) {
            $canEditOpeningValue = $asset->canEditOpeningValue();
            $openingValue = round((float) ($data['opening_value'] ?? $asset->opening_value), 2);

            $asset->update([
                'name' => $data['name'],
                'category' => $data['category'] ?? null,
                'purchase_date' => $data['purchase_date'] ?? null,
                'opening_value' => $canEditOpeningValue ? $openingValue : $asset->opening_value,
            ]);

            if ($canEditOpeningValue) {
                $this->syncOpeningTransaction($asset, $openingValue);
            }

            return $asset->fresh();
        });
    }

    /**
     * Correct the opening entry itself. Only reachable while the asset has
     * no other movement, so current_value can safely follow the difference.
     */
    private function syncOpeningTransaction(Asset $asset, float $openingValue): void
    {
        $opening = $asset->openingTransaction();

        if ($opening === null) {
            if ($openingValue !== 0.0) {
                $asset->addLedgerTransaction(AssetTransactionType::OpeningAsset->value, $openingValue);
                $this->postOpeningJournal($asset, $openingValue);
            }

            return;
        }

        $delta = $openingValue - $opening->amount;

        if ($openingValue === 0.0) {
            $opening->delete();
        } else {
            $opening->update(['amount' => $openingValue]);
        }

        if ($delta !== 0.0) {
            $asset->increment('current_value', $delta);
            $this->syncOpeningJournal($asset, $openingValue);
        }
    }

    /**
     * The journal entry is never edited — the amount changed, so the
     * original (if any) is reversed and a fresh one posted for the new
     * amount.
     */
    private function syncOpeningJournal(Asset $asset, float $newValue): void
    {
        $original = JournalEntry::query()
            ->where('reference_type', 'asset_opening_value')
            ->where('reference_id', $asset->id)
            ->where('status', 'posted')
            ->first();

        if ($original !== null) {
            $this->journal->reverse($original, 'Opening value corrected');
        }

        if ($newValue !== 0.0) {
            $this->postOpeningJournal($asset, $newValue);
        }
    }

    private function postOpeningJournal(Asset $asset, float $amount): void
    {
        $this->journal->postOpeningBalance(
            today(),
            $this->chartOfAccounts->code('1400'),
            $this->chartOfAccounts->code('3300'),
            $amount,
            'asset_opening_value',
            $asset->id,
            "Opening value: {$asset->name}",
        );
    }
}
