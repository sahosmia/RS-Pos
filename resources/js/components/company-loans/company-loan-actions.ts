import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type CompanyLoanListItem } from '@/types/models';
import { Eye, Pencil, Trash2 } from 'lucide-react';

interface CompanyLoanActionHandlers {
    onEdit: (loan: CompanyLoanListItem) => void;
    onDelete: (loan: CompanyLoanListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getCompanyLoanActions(loan: CompanyLoanListItem, { onEdit, onDelete }: CompanyLoanActionHandlers): RowAction[] {
    return [
        { label: 'View', icon: Eye, href: route('company-loans.show', loan.id) },
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(loan) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onDelete(loan),
            hidden: !loan.can_delete,
        },
    ];
}
