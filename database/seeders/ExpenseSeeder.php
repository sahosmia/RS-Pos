<?php

namespace Database\Seeders;

use App\Actions\Expenses\Expense\CreateExpenseAction;
use App\Models\Account;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo expenses — rent, electricity, salary, transport, internet; each paid in full from an account
 * the moment it is recorded. Seeds once: skipped if the demo scenario is already in the database.
 */
class ExpenseSeeder extends Seeder
{
    public function run(): void
    {
        if (Expense::query()->where('note', 'Monthly salary — 2 staff')->exists()) {
            $this->command?->warn('Demo expenses are already seeded — skipping ExpenseSeeder.');

            return;
        }

        $this->call([AccountSeeder::class, ExpenseCategorySeeder::class]);

        $this->seedExpenses(DemoLookup::accounts());
    }

    /**
     * @param  array<string, Account>  $accounts
     */
    private function seedExpenses(array $accounts): void
    {
        $createExpense = app(CreateExpenseAction::class);
        $categories = ExpenseCategory::query()->get()->keyBy('name');

        foreach ([
            ['Room Rent', 15000, 25, 'bank', 'Shop rent'],
            ['Electricity Bill', 4500, 10, 'bank', 'Electricity — monthly bill'],
            ['Staff Salary', 45000, 5, 'bank', 'Monthly salary — 2 staff'],
            ['Transport', 1200, 3, 'cash', 'Delivery van fuel'],
            ['Internet Bill', 2000, 2, 'cash', 'Internet — monthly'],
        ] as [$category, $amount, $daysAgo, $account, $note]) {
            $createExpense->execute([
                'expense_category_id' => $categories[$category]->id,
                'account_id' => $accounts[$account]->id,
                'total_amount' => $amount,
                'expense_date' => Carbon::today()->subDays($daysAgo)->toDateString(),
                'note' => $note,
            ]);
        }
    }
}
