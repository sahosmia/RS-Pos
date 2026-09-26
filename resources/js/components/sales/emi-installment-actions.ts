import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type EmiInstallmentListItem } from '@/types/models';
import { Wallet } from 'lucide-react';

interface EmiInstallmentActionHandlers {
    onPay: (installment: EmiInstallmentListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getEmiInstallmentActions(installment: EmiInstallmentListItem, { onPay }: EmiInstallmentActionHandlers): RowAction[] {
    return [
        {
            label: 'Pay',
            icon: Wallet,
            onClick: () => onPay(installment),
            hidden: installment.status === 'paid',
        },
    ];
}
