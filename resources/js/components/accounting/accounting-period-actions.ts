import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type AccountingPeriodListItem } from '@/types/models';
import { Lock } from 'lucide-react';

interface AccountingPeriodActionHandlers {
    onClose: (period: AccountingPeriodListItem) => void;
}

/** Row actions for the Accounting Periods list's action menu. */
export function getAccountingPeriodActions(period: AccountingPeriodListItem, { onClose }: AccountingPeriodActionHandlers): RowAction[] {
    return [{ label: 'Close Period', icon: Lock, onClick: () => onClose(period), hidden: period.status !== 'open' }];
}
