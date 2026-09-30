<?php

namespace Database\Seeders;

use App\Actions\Expenses\ExpenseCategory\CreateExpenseCategoryAction;
use Illuminate\Database\Seeder;

class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        $createCategory = app(CreateExpenseCategoryAction::class);
        $names = ['Room Rent', 'Electricity Bill', 'Staff Salary', 'Transport', 'Internet Bill'];

        foreach ($names as $name) {
            $createCategory->execute(['name' => $name]);
        }
    }
}
