<?php

namespace Database\Seeders;

use App\Models\AccountType;
use Illuminate\Database\Seeder;

class AccountTypeSeeder extends Seeder
{
    /**
     * Starting point only — shop owners can add their own types later.
     */
    public function run(): void
    {
        foreach (['Cash', 'Bank', 'Mobile Banking', 'Cheque'] as $name) {
            AccountType::query()->firstOrCreate(['name' => $name]);
        }
    }
}
