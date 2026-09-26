import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type WarrantyClaimListItem } from '@/types/models';
import { Pencil } from 'lucide-react';

interface WarrantyClaimActionHandlers {
    onUpdate: (claim: WarrantyClaimListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getWarrantyClaimActions(claim: WarrantyClaimListItem, { onUpdate }: WarrantyClaimActionHandlers): RowAction[] {
    return [{ label: 'Update', icon: Pencil, onClick: () => onUpdate(claim) }];
}
