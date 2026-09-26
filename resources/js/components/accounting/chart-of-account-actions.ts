import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type ChartOfAccountListItem } from '@/types/models';
import { BookText, Pencil, Trash2 } from 'lucide-react';

interface ChartOfAccountActionHandlers {
    onEdit: (account: ChartOfAccountListItem) => void;
    onDelete: (account: ChartOfAccountListItem) => void;
}

/** Row actions for the Chart of Accounts list's action menu. */
export function getChartOfAccountActions(
    account: ChartOfAccountListItem,
    { onEdit, onDelete }: ChartOfAccountActionHandlers,
): RowAction[] {
    return [
        { label: 'Ledger', icon: BookText, href: route('chart-of-accounts.ledger', account.id) },
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(account) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(account),
            hidden: !account.can_delete,
        },
    ];
}
