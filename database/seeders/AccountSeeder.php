<?php

namespace Database\Seeders;

use App\Actions\Accounting\Account\CreateAccountAction;
use App\Models\Account;
use App\Models\AccountType;
use Illuminate\Database\Seeder;

class AccountSeeder extends Seeder
{
    public const CASH = 'Cash in Hand';

    public const BANK = 'City Bank Ltd — Current A/C';

    public const BKASH = 'bKash Merchant';

    /**
     * Funded with an opening balance so the demo purchases/sales/expenses that
     * pay from them never run into "insufficient balance".
     *
     * @var list<array<string, mixed>>
     */
    private const SPECS = [
        ['name' => self::CASH, 'type' => 'Cash', 'opening_balance' => 100000, 'is_default' => true],
        ['name' => self::BANK, 'type' => 'Bank', 'opening_balance' => 1000000, 'account_number' => '1012345678901'],
        ['name' => self::BKASH, 'type' => 'Mobile Banking', 'opening_balance' => 50000],
    ];

    public function run(): void
    {
        $this->call([AccountTypeSeeder::class, ChartOfAccountSeeder::class]);

        $createAccount = app(CreateAccountAction::class);
        $typeIds = AccountType::query()->pluck('id', 'name');

        foreach (self::SPECS as $spec) {
            if (Account::query()->where('name', $spec['name'])->exists()) {
                continue;
            }

            $createAccount->execute([
                'name' => $spec['name'],
                'account_type_id' => $typeIds[$spec['type']],
                'account_number' => $spec['account_number'] ?? null,
                'opening_balance' => $spec['opening_balance'],
                'is_default' => $spec['is_default'] ?? false,
            ]);
        }
    }
}
