import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type ExpenseListItem } from '@/types/models';
import { CreditCard, Pencil, Trash2 } from 'lucide-react';

interface ExpenseActionHandlers {
    onEdit: (expense: ExpenseListItem) => void;
    onPay: (expense: ExpenseListItem) => void;
    onDelete?: (expense: ExpenseListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getExpenseActions(expense: ExpenseListItem, { onEdit, onPay, onDelete }: ExpenseActionHandlers): RowAction[] {
    return [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(expense), hidden: !expense.can_edit },
        { label: 'Add Payment', icon: CreditCard, onClick: () => onPay(expense), hidden: expense.due_amount <= 0 },
        {
            label: 'Delete',
            icon: Trash2,
            onClick: () => onDelete?.(expense),
            hidden: !expense.can_edit || !onDelete,
            variant: 'destructive',
        },
    ];
}
