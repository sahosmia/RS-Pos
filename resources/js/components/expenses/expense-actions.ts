import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type ExpenseListItem } from '@/types/models';
import { CreditCard, Pencil } from 'lucide-react';

interface ExpenseActionHandlers {
    onEdit: (expense: ExpenseListItem) => void;
    onPay: (expense: ExpenseListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getExpenseActions(expense: ExpenseListItem, { onEdit, onPay }: ExpenseActionHandlers): RowAction[] {
    return [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(expense), hidden: !expense.can_edit },
        { label: 'Add Payment', icon: CreditCard, onClick: () => onPay(expense), hidden: expense.due_amount <= 0 },
    ];
}
