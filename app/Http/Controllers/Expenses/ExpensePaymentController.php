<?php

namespace App\Http\Controllers\Expenses;

use App\Actions\Expenses\Expense\AddExpensePaymentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Expenses\Expense\ExpensePaymentRequest;
use App\Models\Expense;
use Illuminate\Http\RedirectResponse;

class ExpensePaymentController extends Controller
{
    public function store(ExpensePaymentRequest $request, Expense $expense, AddExpensePaymentAction $addPayment): RedirectResponse
    {
        if ($expense->due_amount <= 0.0) {
            return back()->withErrors(['expense' => 'This expense is already fully paid.']);
        }

        $addPayment->execute($expense, $request->validated('payments'));

        return back();
    }
}
