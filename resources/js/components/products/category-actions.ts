import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type CategoryListItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface CategoryActionHandlers {
    onEdit: (category: CategoryListItem) => void;
    onDelete: (category: CategoryListItem) => void;
}

/** Row actions for the Categories list's action menu. */
export function getCategoryActions(category: CategoryListItem, { onEdit, onDelete }: CategoryActionHandlers): RowAction[] {
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
