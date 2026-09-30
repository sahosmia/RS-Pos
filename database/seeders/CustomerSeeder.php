<?php

namespace Database\Seeders;

use App\Actions\Contact\CreateContactAction;
use App\Models\Contact;
use App\Models\CustomerGroup;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    /**
     * Order matters — the demo sale scenarios pick customers by position.
     *
     * @var list<array{name: string, group: string, opening_balance: int}>
     */
    public const SPECS = [
        ['name' => 'Abdul Karim', 'group' => 'VIP', 'opening_balance' => 0],
        ['name' => 'Rahima Begum', 'group' => 'Regular', 'opening_balance' => 5000],
        ['name' => 'Mizanur Rahman', 'group' => 'Regular', 'opening_balance' => 0],
        ['name' => 'Sultana Akter', 'group' => 'Wholesale', 'opening_balance' => 0],
        ['name' => 'Jashim Uddin', 'group' => 'Regular', 'opening_balance' => 0],
    ];

    public function run(): void
    {
        // A non-zero opening balance posts a journal entry against the ledger accounts.
        $this->call([ChartOfAccountSeeder::class, CustomerGroupSeeder::class]);

        $createContact = app(CreateContactAction::class);
        $groupIds = CustomerGroup::query()->pluck('id', 'name');

        foreach (self::SPECS as $i => $spec) {
            if (Contact::query()->where('name', $spec['name'])->exists()) {
                continue;
            }

            $createContact->execute([
                'name' => $spec['name'],
                'phone' => '+8801'.str_pad((string) (700000001 + $i), 9, '0', STR_PAD_LEFT),
                'type' => 'customer',
                'customer_group_id' => $groupIds[$spec['group']],
                'opening_balance' => $spec['opening_balance'],
            ]);
        }
    }
}
