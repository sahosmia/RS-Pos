<?php

namespace Database\Seeders;

use App\Enums\BalanceEffect;
use App\Enums\StaffTransactionNature;
use App\Models\StaffTransactionType;
use Illuminate\Database\Seeder;

class StaffTransactionTypeSeeder extends Seeder
{
    /** The only types offered when adding a staff transaction. */
    public const ACTIVE_TYPES = ['Salary', 'Advance', 'Advance Return'];

    /**
     * Salary — paid out in one step, no effect on the staff balance. Advance — money given to the staff
     * member (covers loans too), they owe it back. Advance Return — they pay it back.
     */
    public function run(): void
    {
        // "Advance Given" was renamed to plain "Advance" — keep its existing ledger rows attached.
        StaffTransactionType::query()->where('name', 'Advance Given')->update(['name' => 'Advance']);

        collect([
            ['Salary', BalanceEffect::None, StaffTransactionNature::Salary],
            ['Advance', BalanceEffect::Increase, StaffTransactionNature::Advance],
            ['Advance Return', BalanceEffect::Decrease, StaffTransactionNature::AdvanceReturn],
        ])->each(fn (array $row) => StaffTransactionType::query()->firstOrCreate(
            ['name' => $row[0]],
            ['effect_on_balance' => $row[1], 'nature' => $row[2]],
        ));
    }
}
