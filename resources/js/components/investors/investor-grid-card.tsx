import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getInvestorActions } from '@/components/investors/investor-actions';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type InvestorListItem } from '@/types/models';
import { Link } from '@inertiajs/react';

interface InvestorGridCardProps {
    investor: InvestorListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onEdit: (investor: InvestorListItem) => void;
    onDelete: (investor: InvestorListItem) => void;
}

/** One investor as a card — the grid view and the mobile list. */
export function InvestorGridCard({ investor, selected, onToggleSelected, onEdit, onDelete }: InvestorGridCardProps) {
    const money = useMoneyFormat();

    return (
        <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <Link href={route('investors.show', investor.id)} className="truncate font-medium underline-offset-2 hover:underline">
                        {investor.name}
                    </Link>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <span className="font-medium tabular-nums">{money(investor.total_invested)}</span>
                    <DataTableRowActions actions={getInvestorActions(investor, { onEdit, onDelete })} />
                </div>
            </div>
        </div>
    );
}
