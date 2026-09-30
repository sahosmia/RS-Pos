<?php

namespace Database\Seeders;

use App\Actions\Expenses\Expense\AddExpensePaymentAction;
use App\Actions\Expenses\Expense\CreateExpenseAction;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo expenses — rent, electricity, salary, transport, internet; paid in
 * full, part-paid, and fully due. Seeds once: skipped if the demo scenario is
 * already in the database.
 */
class ExpenseSeeder extends Seeder
{
    public function run(): void
    {
        if (Expense::query()->where('note', 'Monthly salary — 2 staff')->exists()) {
            $this->command?->warn('Demo expenses are already seeded — skipping ExpenseSeeder.');

            return;
        }

        $this->call([AccountSeeder::class, ExpenseCategorySeeder::class, SupplierSeeder::class]);

        $this->seedExpenses(['customers' => [], 'suppliers' => DemoLookup::suppliers()], DemoLookup::accounts());
    }

    /**
     * @param  array{customers: array<int, Contact>, suppliers: array<string, Contact>}  $contacts
     * @param  array<string, Account>  $accounts
     */
    private function seedExpenses(array $contacts, array $accounts): void
    {
        $createExpense = app(CreateExpenseAction::class);
        $addPayment = app(AddExpensePaymentAction::class);
        $suppliers = $contacts['suppliers'];

        $categories = ExpenseCategory::query()->get()->keyBy('name');

        // Room Rent — this month, paid in full.
        $rent1 = $createExpense->execute([
            'expense_category_id' => $categories['Room Rent']->id,
            'contact_id' => $suppliers['landlord']->id,
            'total_amount' => 15000,
            'expense_date' => Carbon::today()->subDays(25)->toDateString(),
        ]);
        $addPayment->execute($rent1, [['account_id' => $accounts['bank']->id, 'amount' => 15000]]);

        // Electricity Bill — partially paid.
        $electricity = $createExpense->execute([
            'expense_category_id' => $categories['Electricity Bill']->id,
            'contact_id' => $suppliers['desco']->id,
            'total_amount' => 4500,
            'expense_date' => Carbon::today()->subDays(10)->toDateString(),
        ]);
        $addPayment->execute($electricity, [['account_id' => $accounts['cash']->id, 'amount' => 2000]]);

        // Staff Salary — accrued, fully due.
        $createExpense->execute([
            'expense_category_id' => $categories['Staff Salary']->id,
            'total_amount' => 45000,
            'expense_date' => Carbon::today()->subDays(5)->toDateString(),
            'note' => 'Monthly salary — 2 staff',
        ]);

        // Transport — small, paid immediately.
        $transport = $createExpense->execute([
            'expense_category_id' => $categories['Transport']->id,
            'total_amount' => 1200,
            'expense_date' => Carbon::today()->subDays(3)->toDateString(),
        ]);
        $addPayment->execute($transport, [['account_id' => $accounts['cash']->id, 'amount' => 1200]]);

        // Internet Bill — fully due.
        $createExpense->execute([
            'expense_category_id' => $categories['Internet Bill']->id,
            'total_amount' => 2000,
            'expense_date' => Carbon::today()->subDays(2)->toDateString(),
        ]);

        // Room Rent — next month's row (recurring = a new row each period, never edited into the last one).
        $createExpense->execute([
            'expense_category_id' => $categories['Room Rent']->id,
            'contact_id' => $suppliers['landlord']->id,
            'total_amount' => 15000,
            'expense_date' => Carbon::today()->addDays(5)->toDateString(),
        ]);
    }
}
