import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type UnitListItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface UnitActionHandlers {
    onEdit: (unit: UnitListItem) => void;
    onDelete: (unit: UnitListItem) => void;
}

/** Row actions for the Units list's action menu. */
export function getUnitActions(unit: UnitListItem, { onEdit, onDelete }: UnitActionHandlers): RowAction[] {
    return [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(unit) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(unit),
            hidden: !unit.can_delete,
        },
    ];
}
