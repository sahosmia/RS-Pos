<?php

namespace Database\Seeders;

use App\Actions\Expenses\ExpenseCategory\CreateExpenseCategoryAction;
use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

class ExpenseCategorySeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const NAMES = ['Room Rent', 'Electricity Bill', 'Staff Salary', 'Transport', 'Internet Bill'];

    public function run(): void
    {
        // Each category auto-creates its own 52xx ledger sub-account under 5200.
        $this->call(ChartOfAccountSeeder::class);

        $createCategory = app(CreateExpenseCategoryAction::class);

        foreach (self::NAMES as $name) {
            if (! ExpenseCategory::query()->where('name', $name)->exists()) {
                $createCategory->execute(['name' => $name]);
            }
        }
    }
}
