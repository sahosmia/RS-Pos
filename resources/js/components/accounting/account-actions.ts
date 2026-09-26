import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type AccountListItem } from '@/types/models';
import { FileText, Pencil, Trash2 } from 'lucide-react';

interface AccountActionHandlers {
    onEdit: (account: AccountListItem) => void;
    onDelete: (account: AccountListItem) => void;
}

/** Row actions for the Accounts list's action menu. */
export function getAccountActions(account: AccountListItem, { onEdit, onDelete }: AccountActionHandlers): RowAction[] {
    return [
        { label: 'Statement', icon: FileText, href: route('accounts.statement', account.id) },
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
