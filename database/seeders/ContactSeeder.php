<?php

namespace Database\Seeders;

use App\Actions\Contact\CreateContactAction;
use App\Models\CustomerGroup;
use Illuminate\Database\Seeder;

class ContactSeeder extends Seeder
{
    public function run(): void
    {
        $createContact = app(CreateContactAction::class);
        $groupIds = CustomerGroup::query()->pluck('id', 'name');

        $customers = [
            ['name' => 'Abdul Karim', 'first_name' => 'Abdul', 'last_name' => 'Karim', 'group' => 'VIP'],
            ['name' => 'Rahima Begum', 'first_name' => 'Rahima', 'last_name' => 'Begum', 'group' => 'Regular'],
            ['name' => 'Mizanur Rahman', 'first_name' => 'Mizanur', 'last_name' => 'Rahman', 'group' => 'Regular'],
            ['name' => 'Sultana Akter', 'first_name' => 'Sultana', 'last_name' => 'Akter', 'group' => 'Wholesale'],
            ['name' => 'Jashim Uddin', 'first_name' => 'Jashim', 'last_name' => 'Uddin', 'group' => 'Regular'],
        ];

        foreach ($customers as $i => $customer) {
            $createContact->execute([
                'name' => $customer['name'],
                'first_name' => $customer['first_name'],
                'last_name' => $customer['last_name'],
                'phone' => '+8801'.str_pad((string) (700000001 + $i), 9, '0', STR_PAD_LEFT),
                'type' => 'customer',
                'customer_group_id' => $groupIds[$customer['group']] ?? null,
                'opening_balance' => 0,
            ]);
        }

        $suppliers = [
            'Walton Distribution',
            'Samsung Electronics BD',
            'LG Bangladesh',
            'Vision Emerging',
            'Landlord — Mr. Hasan Ali',
            'DESCO (Electricity)',
        ];

        foreach ($suppliers as $i => $supplierName) {
            $createContact->execute([
                'name' => $supplierName,
                'first_name' => $supplierName,
                'last_name' => 'Company',
                'phone' => '+8801'.str_pad((string) (800000001 + $i), 9, '0', STR_PAD_LEFT),
                'type' => 'supplier',
                'entity_type' => 'business',
                'business_name' => $supplierName,
                'opening_balance' => 0,
            ]);
        }
    }
}
