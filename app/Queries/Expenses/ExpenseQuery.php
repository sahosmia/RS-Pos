<?php

namespace App\Queries\Expenses;

use App\Models\Expense;
use Illuminate\Database\Eloquent\Builder;

class ExpenseQuery
{
    /**
     * Shared by the Expenses list page and its export endpoint so the two
     * never drift apart — an export must return exactly the rows the list
     * page shows for the same filters.
     *
     * @param  array{from?: ?string, to?: ?string, expense_category_id?: ?int, payment_status?: ?string, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<Expense>
     */
    public static function filtered(array $filters): Builder
    {
        $sort = $filters['sort'] ?? 'expense_date';
        $direction = $filters['direction'] ?? 'desc';
        $allowedSorts = ['voucher_no', 'expense_date', 'title', 'amount', 'due_amount', 'payment_status', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'expense_date';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        return Expense::query()
            ->with(['category:id,name', 'contact:id,name'])
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('expense_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('expense_date', '<=', $to))
            ->when($filters['expense_category_id'] ?? null, fn (Builder $q, int $id) => $q->where('expense_category_id', $id))
            ->when($filters['payment_status'] ?? null, fn (Builder $q, string $status) => $q->where('payment_status', $status))
            ->orderBy($sort, $direction)
            ->orderByDesc('id');
    }
}
