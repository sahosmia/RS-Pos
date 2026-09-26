<?php

namespace App\Actions\Asset;

use App\Enums\AssetTransactionType;
use App\Models\Asset;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateAssetAction
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, category?: string|null, purchase_date?: string|null, opening_value?: float|string|null}  $data
     */
    public function execute(array $data): Asset
    {
        return DB::transaction(function () use ($data) {
            $asset = Asset::create([
                'name' => $data['name'],
                'category' => $data['category'] ?? null,
                'purchase_date' => $data['purchase_date'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $openingValue = round((float) ($data['opening_value'] ?? 0), 2);

            if ($openingValue !== 0.0) {
                $asset->update(['opening_value' => $openingValue]);
                $asset->addLedgerTransaction(AssetTransactionType::OpeningAsset->value, $openingValue);

                $this->journal->postOpeningBalance(
                    today(),
                    $this->chartOfAccounts->code('1400'),
                    $this->chartOfAccounts->code('3300'),
                    $openingValue,
                    'asset_opening_value',
                    $asset->id,
                    "Opening value: {$asset->name}",
                );
            }

            return $asset->fresh();
        });
    }
}
