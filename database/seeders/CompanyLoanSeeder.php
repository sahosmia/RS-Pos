<?php

namespace Database\Seeders;

use App\Actions\CompanyLoan\AddLoanTransactionAction;
use App\Models\Account;
use App\Models\CompanyLoan;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * A demo bank loan with disbursement, interest charge and a repayment. Seeds
 * once: skipped if a loan from the demo lender already exists.
 */
class CompanyLoanSeeder extends Seeder
{
    public function run(): void
    {
        if (CompanyLoan::query()->where('lender_name', 'City Bank Ltd')->exists()) {
            $this->command?->warn('The demo company loan is already seeded — skipping CompanyLoanSeeder.');

            return;
        }

        $this->call(AccountSeeder::class);

        $this->seedCompanyLoan(DemoLookup::accounts());
    }

    /**
     * @param  array<string, Account>  $accounts
     */
    private function seedCompanyLoan(array $accounts): void
    {
        $loan = CompanyLoan::create([
            'lender_name' => 'City Bank Ltd',
            'loan_amount' => 200000,
            'interest_rate' => 9,
            'start_date' => Carbon::today()->subMonths(4)->toDateString(),
        ]);

        $addTransaction = app(AddLoanTransactionAction::class);
        $addTransaction->execute($loan, ['type' => 'disbursement', 'amount' => 200000, 'account_id' => $accounts['bank']->id]);
        $addTransaction->execute($loan->fresh(), ['type' => 'interest_charge', 'amount' => 5000]);
        $addTransaction->execute($loan->fresh(), ['type' => 'repayment', 'amount' => 30000, 'account_id' => $accounts['bank']->id]);
    }
}
