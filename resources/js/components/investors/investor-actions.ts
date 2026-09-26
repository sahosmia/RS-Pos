import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type InvestorListItem } from '@/types/models';
import { Eye, Pencil, Trash2 } from 'lucide-react';

interface InvestorActionHandlers {
    onEdit: (investor: InvestorListItem) => void;
    onDelete: (investor: InvestorListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getInvestorActions(investor: InvestorListItem, { onEdit, onDelete }: InvestorActionHandlers): RowAction[] {
    return [
        { label: 'View', icon: Eye, href: route('investors.show', investor.id) },
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(investor) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(investor),
            hidden: !investor.can_delete,
        },
    ];
}
