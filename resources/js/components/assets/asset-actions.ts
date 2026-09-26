import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type AssetListItem } from '@/types/models';
import { Eye, Pencil, Trash2 } from 'lucide-react';

interface AssetActionHandlers {
    onEdit: (asset: AssetListItem) => void;
    onDelete: (asset: AssetListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getAssetActions(asset: AssetListItem, { onEdit, onDelete }: AssetActionHandlers): RowAction[] {
    return [
        { label: 'View', icon: Eye, href: route('assets.show', asset.id) },
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(asset) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(asset),
            hidden: !asset.can_delete,
        },
    ];
}
