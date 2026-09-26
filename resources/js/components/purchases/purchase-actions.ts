import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type PurchaseListItem } from '@/types/models';
import { Eye, Pencil, Trash2 } from 'lucide-react';

interface PurchaseActionHandlers {
    onDelete: (purchase: PurchaseListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getPurchaseActions(purchase: PurchaseListItem, { onDelete }: PurchaseActionHandlers): RowAction[] {
    return [
        { label: 'View', icon: Eye, href: route('purchases.show', purchase.id) },
        { label: 'Edit', icon: Pencil, href: route('purchases.edit', purchase.id), hidden: !purchase.can_edit },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(purchase),
            hidden: !purchase.can_edit,
        },
    ];
}
