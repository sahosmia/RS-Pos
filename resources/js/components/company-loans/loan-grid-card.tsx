import { getCompanyLoanActions } from '@/components/company-loans/company-loan-actions';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type CompanyLoanListItem } from '@/types/models';
import { Link } from '@inertiajs/react';

interface LoanGridCardProps {
    loan: CompanyLoanListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onEdit: (loan: CompanyLoanListItem) => void;
    onDelete: (loan: CompanyLoanListItem) => void;
}

/** One loan as a card — the grid view and the mobile list. */
export function LoanGridCard({ loan, selected, onToggleSelected, onEdit, onDelete }: LoanGridCardProps) {
    const money = useMoneyFormat();

    return (
        <div className="rounded-brand-card bg-card p-3 shadow-[var(--brand-card-shadow-elevated)]">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <div className="min-w-0">
                        <Link href={route('company-loans.show', loan.id)} className="truncate font-medium underline-offset-2 hover:underline">
                            {loan.lender_name}
                        </Link>
                        <div className="text-muted-foreground text-xs">{loan.start_date}</div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <span className="font-medium tabular-nums">{money(loan.loan_amount)}</span>
                    <DataTableRowActions actions={getCompanyLoanActions(loan, { onEdit, onDelete })} />
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {loan.interest_rate ? `${loan.interest_rate}% interest` : 'No interest'}
                </span>
                <span className="font-medium tabular-nums">{money(loan.outstanding_balance)}</span>
            </div>
        </div>
    );
}
