import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getServiceRequestActions } from '@/components/service-requests/service-request-actions';
import { useServiceRequestLabels } from '@/components/service-requests/service-request-columns';
import ContactLink from '@/components/shared/contact-link';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/format-date';
import { type ServiceRequestListItem, type ServiceRequestStatusValue } from '@/types/models';

interface ServiceRequestGridCardProps {
    request: ServiceRequestListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onUpdate: (request: ServiceRequestListItem, preset: ServiceRequestStatusValue | null) => void;
}

/** One service request as a card — the grid view and the mobile list. */
export function ServiceRequestGridCard({ request, selected, onToggleSelected, onUpdate }: ServiceRequestGridCardProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();
    const labels = useServiceRequestLabels();

    return (
        <div className="rounded-brand-card bg-card p-3 shadow-[var(--brand-card-shadow-elevated)]">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {request.product.name} <span className="text-muted-foreground">({request.product.sku})</span>
                        </p>
                        <div className="text-muted-foreground text-xs">
                            {request.invoice_no} — <ContactLink id={request.customer.id} name={request.customer.name} />
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {request.is_free ? (
                        <Badge variant="secondary">{t('serviceRequests', 'free')}</Badge>
                    ) : (
                        <span className="font-medium tabular-nums">{money(request.charge_amount)}</span>
                    )}
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(request.request_date)} · {labels.type[request.type]}
                </span>
                <div className="flex items-center gap-1">
                    <StatusBadge status={request.status} label={labels.status[request.status]} />
                    <DataTableRowActions actions={getServiceRequestActions(request, { onUpdate })} />
                </div>
            </div>
        </div>
    );
}
