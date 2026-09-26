<?php

namespace App\Http\Controllers\Reports;

use App\Enums\ChartOfAccountType;
use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Models\Settings;
use App\Support\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Accrual Profit & Loss, sourced entirely from the Journal (পর্ব ৬.৫/৩৫) —
 * Income-type account balances minus Expense-type (Cost of Goods Sold
 * included, since it's its own expense-type account) for the date range.
 * Never touches `sales`/`sale_items`/`expenses` directly; those stay
 * subsidiary detail, not the report's source of truth.
 */
class ProfitLossController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $default = FiscalYear::current(Settings::current()->fiscal_year_start_month);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = Carbon::parse($validated['from'] ?? $default['start']);
        $to = Carbon::parse($validated['to'] ?? $default['end']);

        $income = $this->lines(ChartOfAccountType::Income, $from, $to);
        $expense = $this->lines(ChartOfAccountType::Expense, $from, $to);

        $totalIncome = round($income->sum('amount'), 2);
        $totalExpense = round($expense->sum('amount'), 2);

        return Inertia::render('reports/profit-loss', [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'income' => $income->values(),
            'expense' => $expense->values(),
            'totalIncome' => $totalIncome,
            'totalExpense' => $totalExpense,
            'netProfit' => round($totalIncome - $totalExpense, 2),
        ]);
    }

    /**
     * @return Collection<int, array{id: int, code: string, name: string, amount: float}>
     */
    private function lines(ChartOfAccountType $type, Carbon $from, Carbon $to): Collection
    {
        return ChartOfAccount::query()
            ->where('type', $type)
            ->withSum(['lines as debit_sum' => function ($query) use ($from, $to) {
                $query->whereHas('journalEntry', fn ($q) => $q->whereBetween('entry_date', [$from, $to]));
            }], 'debit')
            ->withSum(['lines as credit_sum' => function ($query) use ($from, $to) {
                $query->whereHas('journalEntry', fn ($q) => $q->whereBetween('entry_date', [$from, $to]));
            }], 'credit')
            ->orderBy('code')
            ->get()
            ->map(fn (ChartOfAccount $account) => [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'amount' => $type === ChartOfAccountType::Income
                    ? round(($account->credit_sum ?? 0) - ($account->debit_sum ?? 0), 2)
                    : round(($account->debit_sum ?? 0) - ($account->credit_sum ?? 0), 2),
            ])
            ->filter(fn (array $row) => $row['amount'] != 0.0);
    }
}
