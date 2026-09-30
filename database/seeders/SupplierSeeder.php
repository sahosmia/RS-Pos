<?php

namespace Database\Seeders;

use App\Actions\Contact\CreateContactAction;
use App\Models\Contact;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    /**
     * Keyed — the demo purchase/expense scenarios reference suppliers by key.
     * A negative opening balance means the shop owes them.
     *
     * @var array<string, array{name: string, opening_balance: int}>
     */
    public const SPECS = [
        'walton' => ['name' => 'Walton Distribution', 'opening_balance' => -15000],
        'samsung' => ['name' => 'Samsung Electronics BD', 'opening_balance' => 0],
        'lg' => ['name' => 'LG Bangladesh', 'opening_balance' => 0],
        'vision' => ['name' => 'Vision Emerging', 'opening_balance' => 0],
        'landlord' => ['name' => 'Landlord — Mr. Hasan Ali', 'opening_balance' => 0],
        'desco' => ['name' => 'DESCO (Electricity)', 'opening_balance' => 0],
    ];

    public function run(): void
    {
        $this->call(ChartOfAccountSeeder::class);

        $createContact = app(CreateContactAction::class);
        $i = 0;

        foreach (self::SPECS as $spec) {
            if (! Contact::query()->where('name', $spec['name'])->exists()) {
                $createContact->execute([
                    'name' => $spec['name'],
                    'phone' => '+8801'.str_pad((string) (800000001 + $i), 9, '0', STR_PAD_LEFT),
                    'type' => 'supplier',
                    'entity_type' => 'business',
                    'business_name' => $spec['name'],
                    'opening_balance' => $spec['opening_balance'],
                ]);
            }

            $i++;
        }
    }
}
