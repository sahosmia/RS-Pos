import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type BrandListItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface BrandActionHandlers {
    onEdit: (brand: BrandListItem) => void;
    onDelete: (brand: BrandListItem) => void;
}

/** Row actions for the Brands list's action menu. */
export function getBrandActions(brand: BrandListItem, { onEdit, onDelete }: BrandActionHandlers): RowAction[] {
    return [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(brand) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(brand),
            hidden: !brand.can_delete,
        },
    ];
}
