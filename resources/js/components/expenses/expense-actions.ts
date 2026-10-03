import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type ExpenseListItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface ExpenseActionHandlers {
    onEdit: (expense: ExpenseListItem) => void;
    onDelete?: (expense: ExpenseListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getExpenseActions(expense: ExpenseListItem, { onEdit, onDelete }: ExpenseActionHandlers): RowAction[] {
    return [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(expense) },
        {
            label: 'Delete',
            icon: Trash2,
            onClick: () => onDelete?.(expense),
            hidden: !onDelete,
            variant: 'destructive',
        },
    ];
}
