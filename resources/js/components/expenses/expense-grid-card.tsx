import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getExpenseActions } from '@/components/expenses/expense-actions';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDateTime } from '@/lib/format-date';
import { type ExpenseListItem } from '@/types/models';

interface ExpenseGridCardProps {
    expense: ExpenseListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onEdit: (expense: ExpenseListItem) => void;
    onDelete: (expense: ExpenseListItem) => void;
}

/** One expense as a card — the grid view and the mobile list. */
export function ExpenseGridCard({ expense, selected, onToggleSelected, onEdit, onDelete }: ExpenseGridCardProps) {
    const money = useMoneyFormat();

    return (
        <div className="rounded-brand-card bg-card p-3 shadow-[var(--brand-card-shadow-elevated)]">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <div className="min-w-0">
                        <div className="font-medium">{expense.category.name}</div>
                        {expense.note && <div className="text-muted-foreground line-clamp-2 text-xs break-words">{expense.note}</div>}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <span className="font-medium tabular-nums">{money(expense.total_amount)}</span>
                    <DataTableRowActions actions={getExpenseActions(expense, { onEdit, onDelete })} />
                </div>
            </div>

            <div className="text-muted-foreground mt-2 flex justify-between gap-2 text-xs">
                <span className="whitespace-nowrap">{formatDateTime(expense.created_at ?? expense.expense_date)}</span>
                <span className="truncate">{expense.account?.name ?? '—'}</span>
            </div>
        </div>
    );
}
