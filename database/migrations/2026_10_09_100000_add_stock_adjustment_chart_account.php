<?php

use App\Enums\ChartOfAccountType;
use App\Enums\NormalBalance;
use App\Models\ChartOfAccount;
use Illuminate\Database\Migrations\Migration;

/**
 * Stock adjustments (a count that differs from the books, or serial units lost / found) now post to the General
 * Ledger against this account, so the Inventory account keeps matching the stock the shop actually holds.
 */
return new class extends Migration
{
    public function up(): void
    {
        ChartOfAccount::query()->firstOrCreate(
            ['code' => '5110'],
            [
                'name' => 'Stock Adjustment Loss/Gain',
                'type' => ChartOfAccountType::Expense,
                'normal_balance' => NormalBalance::Debit,
                'parent_id' => null,
                'is_active' => true,
            ],
        );
    }

    public function down(): void
    {
        ChartOfAccount::query()->where('code', '5110')->whereDoesntHave('lines')->delete();
    }
};
