import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDate } from '@/lib/format-date';
import { type OtherIncomeListItem } from '@/types/models';

interface IncomeGridCardProps {
    income: OtherIncomeListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
}

/** One income entry as a card — the grid view and the mobile list. */
export function IncomeGridCard({ income, selected, onToggleSelected }: IncomeGridCardProps) {
    const money = useMoneyFormat();

    return (
        <div className="rounded-brand-card bg-card p-3 shadow-[var(--brand-card-shadow-elevated)]">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <div className="min-w-0">
                        <div className="truncate font-medium">{income.category.name}</div>
                        {income.note && <div className="text-muted-foreground truncate text-xs">{income.note}</div>}
                    </div>
                </div>
                <span className="shrink-0 font-medium tabular-nums">+ {money(income.amount)}</span>
            </div>
            <div className="text-muted-foreground mt-2 flex justify-between gap-2 text-xs">
                <span className="whitespace-nowrap">{formatDate(income.income_date)}</span>
                <span className="truncate">{income.account.name}</span>
            </div>
        </div>
    );
}
