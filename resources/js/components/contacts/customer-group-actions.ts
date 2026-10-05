import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type CustomerGroupListItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface CustomerGroupActionHandlers {
    onEdit: (group: CustomerGroupListItem) => void;
    onDelete: (group: CustomerGroupListItem) => void;
}

/** Row actions for the Customer Groups list's action menu. */
export function getCustomerGroupActions(group: CustomerGroupListItem, { onEdit, onDelete }: CustomerGroupActionHandlers): RowAction[] {
    return [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(group) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(group),
            hidden: !group.can_delete,
        },
    ];
}
