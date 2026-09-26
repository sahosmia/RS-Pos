import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type StaffListItem } from '@/types/models';
import { Eye, Pencil, Trash2 } from 'lucide-react';

interface StaffActionHandlers {
    onEdit: (member: StaffListItem) => void;
    onDelete: (member: StaffListItem) => void;
}

/** Row actions for the Staff list's action menu. */
export function getStaffActions(member: StaffListItem, { onEdit, onDelete }: StaffActionHandlers): RowAction[] {
    return [
        { label: 'View', icon: Eye, href: route('staff.show', member.id) },
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(member) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(member),
            hidden: !member.can_delete,
        },
    ];
}
