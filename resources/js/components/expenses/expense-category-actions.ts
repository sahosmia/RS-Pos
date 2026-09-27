import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type ExpenseCategoryListItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface ExpenseCategoryActionHandlers {
    onEdit: (category: ExpenseCategoryListItem) => void;
    onDelete: (category: ExpenseCategoryListItem) => void;
}

/** Row actions for the Expense Categories list's action menu — mirrors products/category-actions.ts. */
export function getExpenseCategoryActions(
    category: ExpenseCategoryListItem,
    { onEdit, onDelete }: ExpenseCategoryActionHandlers,
): RowAction[] {
    return [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(category) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(category),
            hidden: !category.can_delete,
        },
    ];
}
