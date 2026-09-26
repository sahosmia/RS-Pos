import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type RoleListItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface RoleActionHandlers {
    onEdit: (role: RoleListItem) => void;
    onDelete: (role: RoleListItem) => void;
}

/** Row actions for the Roles list's action menu. */
export function getRoleActions(role: RoleListItem, { onEdit, onDelete }: RoleActionHandlers): RowAction[] {
    return [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(role) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(role),
            hidden: role.protected,
        },
    ];
}
