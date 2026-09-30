<?php

namespace Database\Seeders;

use App\Models\CompanyLoan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class CompanyLoanSeeder extends Seeder
{
    public function run(): void
    {
        CompanyLoan::query()->firstOrCreate(
            ['lender_name' => 'City Bank Ltd'],
            [
                'loan_amount' => 0,
                'interest_rate' => 0,
                'start_date' => Carbon::today()->toDateString(),
            ]
        );
    }
}
