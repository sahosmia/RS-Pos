import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getOtherLiabilityActions } from '@/components/other-liabilities/other-liability-actions';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type OtherLiabilityListItem } from '@/types/models';
import { Link } from '@inertiajs/react';

interface LiabilityGridCardProps {
    liability: OtherLiabilityListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onEdit: (liability: OtherLiabilityListItem) => void;
    onDelete: (liability: OtherLiabilityListItem) => void;
}

/** One liability as a card — the grid view and the mobile list. */
export function LiabilityGridCard({ liability, selected, onToggleSelected, onEdit, onDelete }: LiabilityGridCardProps) {
    const money = useMoneyFormat();

    return (
        <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <Link href={route('other-liabilities.show', liability.id)} className="truncate font-medium underline-offset-2 hover:underline">
                        {liability.name}
                    </Link>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <span className="font-medium tabular-nums">{money(liability.current_balance)}</span>
                    <DataTableRowActions actions={getOtherLiabilityActions(liability, { onEdit, onDelete })} />
                </div>
            </div>
        </div>
    );
}
