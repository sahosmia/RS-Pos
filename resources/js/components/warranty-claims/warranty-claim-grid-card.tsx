import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getWarrantyClaimActions } from '@/components/products/warranty-claim-actions';
import ContactLink from '@/components/shared/contact-link';
import { StatusBadge } from '@/components/shared/status-badge';
import { useWarrantyStatusLabels } from '@/components/warranty-claims/warranty-claim-columns';
import { formatDate } from '@/lib/format-date';
import { type WarrantyClaimListItem } from '@/types/models';

interface WarrantyClaimGridCardProps {
    claim: WarrantyClaimListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onUpdate: (claim: WarrantyClaimListItem) => void;
}

/** One warranty claim as a card — the grid view and the mobile list. */
export function WarrantyClaimGridCard({ claim, selected, onToggleSelected, onUpdate }: WarrantyClaimGridCardProps) {
    const { labels } = useWarrantyStatusLabels();

    return (
        <div className="rounded-brand-card bg-card p-3 shadow-[var(--brand-card-shadow-elevated)]">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {claim.product.name} <span className="text-muted-foreground">({claim.product.sku})</span>
                        </p>
                        <div className="text-muted-foreground text-xs">
                            {claim.invoice_no} — <ContactLink id={claim.customer.id} name={claim.customer.name} />
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <StatusBadge status={claim.status} label={labels[claim.status]} />
                    <DataTableRowActions actions={getWarrantyClaimActions(claim, { onUpdate })} />
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(claim.claim_date)}</span>
                <span className="truncate text-xs">{claim.issue_description}</span>
            </div>
        </div>
    );
}
