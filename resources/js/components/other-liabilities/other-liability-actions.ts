import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type OtherLiabilityListItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface OtherLiabilityActionHandlers {
    onEdit: (liability: OtherLiabilityListItem) => void;
    onDelete: (liability: OtherLiabilityListItem) => void;
}

/** Row actions shared by the table's action menu and the grid card — mirrors the Edit/Delete buttons the raw table used to render inline. */
export function getOtherLiabilityActions(liability: OtherLiabilityListItem, { onEdit, onDelete }: OtherLiabilityActionHandlers): RowAction[] {
    return [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(liability) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(liability),
            hidden: !liability.can_delete,
        },
    ];
}
