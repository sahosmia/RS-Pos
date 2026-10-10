import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getEmiInstallmentActions } from '@/components/sales/emi-installment-actions';
import ContactLink from '@/components/shared/contact-link';
import { StatusBadge } from '@/components/shared/status-badge';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDate } from '@/lib/format-date';
import { type EmiInstallmentListItem } from '@/types/models';

interface EmiInstallmentGridCardProps {
    installment: EmiInstallmentListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onPay: (installment: EmiInstallmentListItem) => void;
}

/** One EMI installment as a card — the grid view and the mobile list. */
export function EmiInstallmentGridCard({ installment, selected, onToggleSelected, onPay }: EmiInstallmentGridCardProps) {
    const money = useMoneyFormat();

    return (
        <div className="rounded-brand-card bg-card p-3 shadow-[var(--brand-card-shadow-elevated)]">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {installment.invoice_no} · #{installment.installment_number}
                        </p>
                        <div className="text-muted-foreground text-xs">
                            <ContactLink id={installment.customer.id} name={installment.customer.name} />
                            {installment.customer.phone && <span className="ml-1.5 tabular-nums">· {installment.customer.phone}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <span className="font-medium tabular-nums">{money(installment.amount)}</span>
                    <DataTableRowActions actions={getEmiInstallmentActions(installment, { onPay })} />
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(installment.due_date)}
                    {installment.paid_amount > 0 && ` · Paid ${money(installment.paid_amount)}`}
                </span>
                <StatusBadge status={installment.status} />
            </div>
        </div>
    );
}
